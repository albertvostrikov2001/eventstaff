import type { InAppNotificationType, PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import { Resend } from 'resend';
import type { Queue } from 'bullmq';
import { renderEmailForType } from '@/emails/render-email';
import { maskEmail } from '@/lib/email-mask';
import type { FastifyBaseLogger } from 'fastify';
import type { NotificationType } from '@/services/notification-service';

export type EmailJob = {
  logId: string;
  userId: string;
  to: string;
  type: InAppNotificationType;
  templateData: Record<string, unknown>;
};

const HOUR_LIMIT = 10;
const DAY_LIMIT = 50;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function fromHeader(): string {
  const name = process.env.RESEND_FROM_NAME?.trim() || 'Юнити';
  const email =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    '';
  if (!email) {
    throw new Error('RESEND_FROM_EMAIL or EMAIL_FROM must be set');
  }
  return `${name} <${email}>`;
}

type PrefKey =
  | 'emailInvitation'
  | 'emailCancellation'
  | 'emailReview'
  | 'emailComplaint'
  | 'emailNewApplication'
  | 'emailApplicationReply';

function prefFieldForType(type: InAppNotificationType): PrefKey | null {
  switch (type) {
    case 'INVITATION':
      return 'emailInvitation';
    case 'CANCELLATION':
      return 'emailCancellation';
    case 'REVIEW_RECEIVED':
      return 'emailReview';
    case 'COMPLAINT_UPDATE':
      return 'emailComplaint';
    case 'APPLICATION_RECEIVED':
      return 'emailNewApplication';
    case 'APPLICATION_RESPONSE':
      return 'emailApplicationReply';
    default:
      return null;
  }
}

export class EmailService {
  private resend: Resend | null;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    private readonly emailQueue: Queue,
    private readonly log: FastifyBaseLogger,
  ) {
    const key = process.env.RESEND_API_KEY?.trim();
    this.resend = key ? new Resend(key) : null;
  }

  async canSend(userId: string, type: NotificationType): Promise<boolean> {
    const field = prefFieldForType(type);
    if (field === null) {
      return true;
    }

    const adminRole = await this.prisma.userRole.findFirst({
      where: { userId, role: 'admin' },
    });
    if (type === 'COMPLAINT_UPDATE' && adminRole) {
      return true;
    }

    const prefs = await this.prisma.notificationPreferences.findUnique({
      where: { userId },
    });
    if (!prefs) {
      return true;
    }
    return prefs[field];
  }

  /** Returns false if hour/day caps exceeded (already rolled back counters). */
  private async takeRateLimitSlot(userId: string): Promise<boolean> {
    const hourKey = `email:ratelimit:hour:${userId}`;
    const dayKey = `email:ratelimit:day:${userId}`;

    const hourCount = await this.redis.incr(hourKey);
    if (hourCount === 1) {
      await this.redis.expire(hourKey, 3600);
    }
    const dayCount = await this.redis.incr(dayKey);
    if (dayCount === 1) {
      await this.redis.expire(dayKey, 86_400);
    }

    if (hourCount > HOUR_LIMIT || dayCount > DAY_LIMIT) {
      await this.redis.decr(hourKey);
      await this.redis.decr(dayKey);
      return false;
    }
    return true;
  }

  async queue(params: {
    /** null — системное письмо (без проверки предпочтений и пер-юзерного лимита) */
    userId: string | null;
    to: string;
    type: NotificationType;
    templateData: Record<string, unknown>;
  }): Promise<void> {
    if (params.userId) {
      if (!(await this.canSend(params.userId, params.type))) {
        this.log.info({ type: params.type, userId: params.userId }, 'Email skipped by user preferences');
        return;
      }

      if (!(await this.takeRateLimitSlot(params.userId))) {
        this.log.warn(
          { type: params.type, userId: params.userId, to: maskEmail(params.to) },
          'Email skipped: rate limit exceeded',
        );
        return;
      }
    }

    const { subject } = renderEmailForType(params.type, params.templateData);
    const logRow = await this.prisma.emailLog.create({
      data: {
        userId: params.userId,
        to: params.to,
        type: params.type,
        subject,
        status: 'PENDING',
        templateData: params.templateData as object,
      },
    });

    await this.emailQueue.add(
      'send-email',
      {
        logId: logRow.id,
        userId: params.userId ?? '',
        to: params.to,
        type: params.type,
        templateData: params.templateData,
      } satisfies EmailJob,
      {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async send(params: EmailJob): Promise<void> {
    const { logId, to, type, templateData } = params;

    if (!this.resend) {
      await this.prisma.emailLog.update({
        where: { id: logId },
        data: {
          status: 'FAILED',
          errorText: 'RESEND_API_KEY is not configured',
        },
      });
      this.log.error('Resend is not configured (missing RESEND_API_KEY)');
      return;
    }

    let from: string;
    try {
      from = fromHeader();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid from header';
      await this.prisma.emailLog.update({
        where: { id: logId },
        data: { status: 'FAILED', errorText: msg },
      });
      this.log.error({ err: e }, 'Email from header misconfiguration');
      return;
    }

    const { subject, html } = renderEmailForType(type, templateData);
    await this.prisma.emailLog.update({
      where: { id: logId },
      data: { subject },
    });

    const waits = [60_000, 300_000];
    let lastErr: unknown;

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await sleep(waits[attempt - 1] ?? 900_000);
      }
      try {
        const { data, error } = await this.resend.emails.send({
          from,
          to: [to],
          subject,
          html,
        });
        if (error) {
          throw new Error(error.message);
        }
        await this.prisma.emailLog.update({
          where: { id: logId },
          data: {
            status: 'SENT',
            providerMessageId: data?.id ?? null,
            sentAt: new Date(),
            errorText: null,
          },
        });
        this.log.info({ logId, to: maskEmail(to), providerId: data?.id }, 'Email sent via Resend');
        return;
      } catch (err) {
        lastErr = err;
        const message = err instanceof Error ? err.message : String(err);
        this.log.warn(
          { logId, attempt: attempt + 1, to: maskEmail(to), err: message },
          'Resend send attempt failed',
        );
      }
    }

    const finalMsg = lastErr instanceof Error ? lastErr.message : String(lastErr);
    await this.prisma.emailLog.update({
      where: { id: logId },
      data: {
        status: 'FAILED',
        errorText: finalMsg.slice(0, 2000),
      },
    });
    this.log.error({ logId, to: maskEmail(to), err: finalMsg }, 'Email failed after retries');
  }

  /** Re-queue a failed send without applying rate limits again. */
  async retrySend(logId: string): Promise<void> {
    const row = await this.prisma.emailLog.findUnique({ where: { id: logId } });
    if (!row) {
      throw Object.assign(new Error('Email log not found'), { statusCode: 404 });
    }
    if (row.status !== 'FAILED') {
      throw Object.assign(new Error('Only FAILED logs can be retried'), { statusCode: 400 });
    }
    if (!row.userId || row.templateData === null || row.templateData === undefined) {
      throw Object.assign(new Error('Log is missing retry payload'), { statusCode: 400 });
    }

    await this.prisma.emailLog.update({
      where: { id: logId },
      data: {
        status: 'PENDING',
        errorText: null,
        providerMessageId: null,
        sentAt: null,
      },
    });

    await this.emailQueue.add(
      'send-email',
      {
        logId: row.id,
        userId: row.userId,
        to: row.to,
        type: row.type,
        templateData: row.templateData as Record<string, unknown>,
      } satisfies EmailJob,
      { attempts: 1, removeOnComplete: true, removeOnFail: false },
    );
  }
}
