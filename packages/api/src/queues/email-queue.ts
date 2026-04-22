import { Worker, Queue } from 'bullmq';
import type { FastifyInstance } from 'fastify';
import type { Booking } from '@prisma/client';
import { bullmqConnectionFromEnv } from '@/lib/bullmq-redis';
import { publicSiteUrl } from '@/lib/public-site-url';
import type { EmailJob } from '@/services/email-service';

const DLQ_NAME = 'email-dlq';

function combineDateTime(date: Date, time?: string | null): Date {
  const d = new Date(date);
  if (time && /^\d{1,2}:\d{2}/.test(time)) {
    const [hh, mm] = time.split(':').map((x) => parseInt(x, 10));
    d.setHours(hh || 0, mm || 0, 0, 0);
  }
  return d;
}

function shiftTitle(booking: Booking & { linkedVacancy?: { title: string } | null }): string {
  if (booking.linkedVacancyId && booking.linkedVacancy) {
    return booking.linkedVacancy.title;
  }
  return booking.description?.slice(0, 80) || 'Смена';
}

/** Starts BullMQ worker, DLQ handler, and repeatable cron jobs. */
export async function startEmailWorkers(fastify: FastifyInstance): Promise<void> {
  const connection = bullmqConnectionFromEnv();
  const emailQueue = fastify.emailQueue;
  const dlq = new Queue(DLQ_NAME, { connection });

  const worker = new Worker(
    emailQueue.name,
    async (job) => {
      const { prisma, redis, log, emailService, notificationService } = fastify;

      if (job.name === 'send-email') {
        await emailService.send(job.data as EmailJob);
        return;
      }

      if (job.name === 'scan-shift-reminders') {
        const now = Date.now();
        const winStart = now + 110 * 60 * 1000;
        const winEnd = now + 130 * 60 * 1000;

        const shifts = await prisma.shift.findMany({
          where: { status: { in: ['PENDING', 'ACTIVE'] } },
          include: {
            booking: {
              include: {
                linkedVacancy: { select: { title: true } },
                worker: { include: { user: { select: { id: true, email: true } } } },
                employer: { include: { user: { select: { id: true, email: true } } } },
              },
            },
          },
        });

        for (const shift of shifts) {
          const start = combineDateTime(shift.booking.date, shift.booking.timeStart);
          const t = start.getTime();
          if (t < winStart || t > winEnd) continue;

          const lockKey = `email:shift-reminder:${shift.id}`;
          const ok = await redis.set(lockKey, '1', 'EX', 7200, 'NX');
          if (ok !== 'OK') continue;

          const title = shiftTitle(shift.booking);
          const loc = shift.booking.location || '—';
          const startStr = start.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
          const site = publicSiteUrl();
          const ctaUrl = `${site}/worker/calendar`;

          const recipients: { userId: string; email: string }[] = [];
          const wEmail = shift.booking.worker.user.email;
          if (wEmail) recipients.push({ userId: shift.booking.worker.user.id, email: wEmail });
          const eEmail = shift.booking.employer.user.email;
          if (eEmail) recipients.push({ userId: shift.booking.employer.user.id, email: eEmail });

          for (const r of recipients) {
            await emailService.queue({
              userId: r.userId,
              to: r.email,
              type: 'SHIFT_REMINDER',
              templateData: {
                vacancyTitle: title,
                location: loc,
                startTime: startStr,
                ctaUrl,
              },
            });
          }
        }
        return;
      }

      if (job.name === 'scan-shift-completion') {
        const shifts = await prisma.shift.findMany({
          where: {
            status: { in: ['PENDING', 'ACTIVE'] },
            OR: [{ workerConfirmed: false }, { employerConfirmed: false }],
          },
          include: {
            booking: { include: { linkedVacancy: { select: { title: true } } } },
            workerUser: { select: { id: true } },
            employerUser: { select: { id: true } },
          },
        });

        const now = Date.now();
        for (const shift of shifts) {
          const end = combineDateTime(shift.booking.date, shift.booking.timeEnd ?? shift.booking.timeStart);
          const deadline = end.getTime() + 2 * 60 * 60 * 1000;
          if (now < deadline) continue;

          const lockKey = `email:shift-completion-notify:${shift.id}`;
          const ok = await redis.set(lockKey, '1', 'EX', 86400, 'NX');
          if (ok !== 'OK') continue;

          const title = shiftTitle(shift.booking);
          const body = `По смене «${title}» не получены оба подтверждения. Откройте кабинет и завершите оформление.`;

          await notificationService.create({
            userId: shift.workerUser.id,
            type: 'SHIFT_COMPLETED',
            title: 'Подтвердите смену',
            body,
            data: { shiftId: shift.id },
          });
          await notificationService.create({
            userId: shift.employerUser.id,
            type: 'SHIFT_COMPLETED',
            title: 'Подтвердите смену',
            body,
            data: { shiftId: shift.id },
          });
        }
        return;
      }

      if (job.name === 'scan-unpaid-shifts') {
        const shifts = await prisma.shift.findMany({
          where: {
            status: 'COMPLETED',
            payments: { some: { status: 'PENDING' } },
          },
          include: {
            booking: {
              include: {
                linkedVacancy: { select: { title: true } },
                worker: { include: { user: true } },
                employer: { include: { user: true } },
              },
            },
            payments: { where: { status: 'PENDING' } },
          },
        });

        const now = Date.now();
        for (const shift of shifts) {
          const end = combineDateTime(shift.booking.date, shift.booking.timeEnd ?? shift.booking.timeStart);
          if (now < end.getTime() + 24 * 60 * 60 * 1000) continue;

          const lockKey = `email:unpaid-reminder:${shift.id}`;
          const ok = await redis.set(lockKey, '1', 'EX', 172800, 'NX');
          if (ok !== 'OK') continue;

          const pay = shift.payments[0];
          if (!pay) continue;

          const employerUser = shift.booking.employer.user;
          const workerProf = shift.booking.worker;
          const workerName = `${workerProf.firstName} ${workerProf.lastName}`.trim() || 'Исполнитель';
          const email = employerUser.email;
          if (!email) continue;

          const amount = `${pay.amount} ${pay.currency}`;
          const shiftDate = end.toLocaleDateString('ru-RU');
          const site = publicSiteUrl();
          const ctaUrl = `${site}/employer/dashboard`;

          await emailService.queue({
            userId: employerUser.id,
            to: email,
            type: 'PAYMENT_REQUIRED',
            templateData: {
              workerName,
              amount,
              shiftDate,
              ctaUrl,
            },
          });
        }
        return;
      }

      log.warn({ jobName: job.name }, 'Unknown email queue job');
    },
    { connection, concurrency: 4 },
  );

  worker.on('failed', async (job, err) => {
    if (!job) return;
    const max = job.opts.attempts ?? 1;
    if (job.attemptsMade >= max) {
      await dlq.add(
        job.name ?? 'unknown',
        { payload: job.data, reason: err?.message },
        { removeOnComplete: false },
      );
      fastify.log.error(
        { jobId: job.id, name: job.name, err: err?.message },
        'Email queue job moved to DLQ',
      );
    }
  });

  await emailQueue.add(
    'scan-shift-reminders',
    {},
    {
      repeat: { every: 300_000 },
      jobId: 'cron-scan-shift-reminders',
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
    },
  );

  await emailQueue.add(
    'scan-shift-completion',
    {},
    {
      repeat: { every: 300_000 },
      jobId: 'cron-scan-shift-completion',
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
    },
  );

  await emailQueue.add(
    'scan-unpaid-shifts',
    {},
    {
      repeat: { every: 3600_000 },
      jobId: 'cron-scan-unpaid-shifts',
      attempts: 3,
      backoff: { type: 'exponential', delay: 60_000 },
    },
  );

  fastify.addHook('onClose', async () => {
    await worker.close();
    await dlq.close();
  });
}
