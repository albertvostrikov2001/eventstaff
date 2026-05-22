import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  ComplaintTargetType,
  ComplaintType,
  ShiftStatus,
  Role,
  type InAppNotificationType,
  type Prisma,
} from '@prisma/client';
import { publicSiteUrl } from '@/lib/public-site-url';
import { ReliabilityService } from '@/services/reliability-service';
import { ensureShiftForBooking } from '@/lib/ensure-booking-shift';
import { paginationSchema } from '@unity/shared';
import { ReviewAccessService } from '@/services/review-access-service';
import { safeUserSelect } from '@/lib/safe-user-select';
import { getOptionalUserId } from '@/lib/optional-jwt';
import { replyFail, replyOk, replyPaginated } from '../../lib/api-reply';

function combineBookingDateTime(date: Date, timeStart: string | null): Date {
  const d = new Date(date);
  if (timeStart) {
    const [h, m] = timeStart.split(':').map((x) => parseInt(x, 10));
    if (!Number.isNaN(h)) d.setHours(h, m && !Number.isNaN(m) ? m : 0, 0, 0);
  }
  return d;
}

export const foundationRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = [fastify.authenticate];
  const authWorkerEmployer = [fastify.authenticate, fastify.requireRole(['worker', 'employer'])];

  const myComplaints = async (request: FastifyRequest, reply: FastifyReply) => {
    const list = await fastify.prisma.complaint.findMany({
      where: { authorId: request.jwtUser.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return replyOk(reply, list);
  };

  fastify.get('/complaints', { preHandler: auth }, myComplaints);
  fastify.get('/complaints/my', { preHandler: auth }, myComplaints);

  fastify.post('/complaints', { preHandler: authWorkerEmployer }, async (request, reply) => {
    const body = z
      .object({
        type: z.nativeEnum(ComplaintType),
        targetType: z.nativeEnum(ComplaintTargetType),
        targetId: z.string(),
        description: z.string().min(20).max(8000),
      })
      .parse(request.body);
    if (body.targetId === request.jwtUser.sub) {
      return replyFail(reply, 400, 'INVALID', 'Нельзя пожаловаться на самого себя');
    }
    const count = await fastify.prisma.complaint.count({
      where: {
        authorId: request.jwtUser.sub,
        targetId: body.targetId,
        targetType: body.targetType,
      },
    });
    if (count >= 3) {
      return replyFail(reply, 400, 'LIMIT', 'Уже 3 жалобы на эту сущность');
    }
    const complaint = await fastify.prisma.complaint.create({
      data: {
        type: body.type,
        targetType: body.targetType,
        targetId: body.targetId,
        description: body.description,
        authorId: request.jwtUser.sub,
      },
    });

    const admins = await fastify.prisma.user.findMany({
      where: { roles: { some: { role: 'admin' } } },
      select: { id: true, email: true },
    });

    const site = publicSiteUrl();
    const authorRole = request.jwtUser.activeRole ?? 'user';

    for (const admin of admins) {
      await fastify.notificationService.create({
        userId: admin.id,
        type: 'COMPLAINT_UPDATE',
        title: `Новая жалоба #${complaint.id.slice(0, 8)}`,
        body: `${body.type}: ${body.description.slice(0, 160)}${body.description.length > 160 ? '…' : ''}`,
        data: { complaintId: complaint.id },
      });
      if (admin.email) {
        await fastify.emailService.queue({
          userId: admin.id,
          to: admin.email,
          type: 'COMPLAINT_UPDATE',
          templateData: {
            id: complaint.id,
            complaintType: body.type,
            authorRole,
            description: body.description,
            ctaUrl: `${site}/admin/complaints`,
          },
        });
      }
    }

    return replyOk(reply, complaint, 201);
  });

  // GET /reliability/me — до /reliability/:userId
  fastify.get('/reliability/me', { preHandler: auth }, async (request, reply) => {
    const row = await fastify.prisma.userReliabilityScore.upsert({
      where: { userId: request.jwtUser.sub },
      create: { userId: request.jwtUser.sub },
      update: {},
    });
    return replyOk(reply, row);
  });

  // GET /reliability/:userId
  fastify.get<{ Params: { userId: string } }>('/reliability/:userId', async (request, reply) => {
    const { userId } = request.params;
    if (userId === 'me') {
      return replyFail(reply, 404, 'NOT_FOUND', 'Not found');
    }
    const row = await fastify.prisma.userReliabilityScore.findUnique({
      where: { userId },
    });
    if (!row) {
      return replyOk(reply, { score: 100, level: 'NEW', totalShifts: 0, isRestricted: false });
    }
    return replyOk(reply, row);
  });

  // GET /users/:id/reviews (лимит — для авторизованных работодателей)
  fastify.get<{ Params: { id: string } }>('/users/:id/reviews', async (request, reply) => {
    const { id: userId } = request.params;
    const q = paginationSchema.parse(request.query);
    const viewerId = await getOptionalUserId(request);
    const reviewAccess = new ReviewAccessService(fastify.prisma);
    if (viewerId) {
      const gate = await reviewAccess.canViewReviews(viewerId, userId);
      if (!gate.allowed) {
        return replyFail(reply, 403, 'LIMIT_EXCEEDED', 'Достигнут лимит просмотра профилей', {
          remaining: 0,
          upgradeTo: gate.upgradeTo,
        });
      }
    }
    const where = { revieweeId: userId };
    const [total, rows] = await fastify.prisma.$transaction([
      fastify.prisma.shiftReview.count({ where }),
      fastify.prisma.shiftReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: {
          reviewer: {
            select: {
              id: true,
              workerProfile: { select: { firstName: true, lastName: true, photoUrl: true } },
              employerProfile: { select: { companyName: true, logoUrl: true } },
            },
          },
          shift: { select: { id: true, completedAt: true, booking: { select: { date: true } } } },
        },
      }),
    ]);
    if (viewerId) {
      await reviewAccess.trackReviewView(viewerId, userId);
    }
    return replyPaginated(reply, rows, {
      total,
      page: q.page,
      limit: q.limit,
      totalPages: Math.ceil(total / q.limit),
    });
  });

  // GET /user/review-usage
  fastify.get('/user/review-usage', { preHandler: auth }, async (request, reply) => {
    const s = new ReviewAccessService(fastify.prisma);
    const u = await s.getUsage(request.jwtUser.sub);
    return replyOk(reply, u);
  });

  fastify.get<{ Params: { id: string } }>('/shifts/:id', { preHandler: auth }, async (request, reply) => {
    const { id } = request.params;
    const shift = await fastify.prisma.shift.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            linkedVacancy: true,
            worker: { include: { user: { select: safeUserSelect } } },
            employer: { include: { user: { select: safeUserSelect } } },
          },
        },
      },
    });
    if (!shift) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Shift not found');
    }
    const uid = request.jwtUser.sub;
    if (shift.workerId !== uid && shift.employerId !== uid) {
      return replyFail(reply, 403, 'FORBIDDEN', 'No access');
    }
    return replyOk(reply, shift);
  });

  const cancelOrderHandler = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const bookingId = (request.params as { id: string }).id;
    const body = z
      .object({
        reasonCode: z.string().min(1).max(64),
        customReason: z.string().max(2000).optional(),
      })
      .parse(request.body);
    const uid = request.jwtUser.sub;
    const booking = await fastify.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        worker: { include: { user: { select: safeUserSelect } } },
        employer: { include: { user: { select: safeUserSelect } } },
      },
    });
    if (!booking) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Заказ не найден');
    }
    const isWorker = booking.worker.userId === uid;
    const isEmployer = booking.employer.userId === uid;
    if (!isWorker && !isEmployer) {
      return replyFail(reply, 403, 'FORBIDDEN', 'Нет доступа');
    }
    const role: Role = isWorker ? 'worker' : 'employer';
    const start = combineBookingDateTime(booking.date, booking.timeStart);
    const now = new Date();
    if (now >= start) {
      return replyFail(reply, 400, 'LATE', 'Смена уже началась — отмена невозможна');
    }
    if (start.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      return replyFail(reply, 400, 'TOO_LATE', 'Отмена возможна не позднее чем за 24 часа до начала');
    }
    const codeNorm =
      body.reasonCode === 'other'
        ? isWorker
          ? 'WORKER_OTHER'
          : 'EMPLOYER_OTHER'
        : body.reasonCode;
    const reasonResolved = await fastify.prisma.cancellationReason.findFirst({
      where: { code: codeNorm, role, isActive: true },
    });
    if (!reasonResolved) {
      return replyFail(reply, 400, 'INVALID', 'Неизвестный код причины');
    }
    if ((body.reasonCode === 'other' || codeNorm.includes('OTHER')) && !body.customReason?.trim()) {
      return replyFail(reply, 400, 'INVALID', 'Укажите причину');
    }
    const { id: shiftId } = await ensureShiftForBooking(fastify.prisma, bookingId);
    const rel = new ReliabilityService(fastify.prisma, fastify.notificationService);
    const text =
      (reasonResolved?.label || '') + (body.customReason ? ` — ${body.customReason}` : '');
    const updated = await fastify.prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: ShiftStatus.CANCELLED,
        cancellationCode: codeNorm,
        cancellationReason: text || body.customReason || null,
        cancelledBy: uid,
        cancelledAt: new Date(),
      },
    });
    await rel.addStrikeAndRecalculate(
      uid,
      `Отмена: ${reasonResolved.label || body.customReason || codeNorm}`,
    );
    const otherId = isWorker ? booking.employer.userId : booking.worker.userId;
    await fastify.notificationService.create({
      userId: otherId,
      type: 'CANCELLATION',
      title: 'Смена отменена',
      body: isWorker ? 'Исполнитель отменил участие' : 'Работодатель отменил смену',
      data: { shiftId, bookingId },
    });
    return replyOk(reply, updated);
  };

  fastify.post<{ Params: { id: string } }>('/bookings/:id/cancel', { preHandler: auth }, cancelOrderHandler);
  fastify.post<{ Params: { id: string } }>('/orders/:id/cancel', { preHandler: auth }, cancelOrderHandler);

  // POST /individual-requests — публичный; при Cookie с access_token связываем createdByUserId (работодатель)
  fastify.post('/individual-requests', async (request, reply) => {
      const dayKey = `individual_req:${request.ip}`;
      const n = await fastify.redis.incr(dayKey);
      if (n === 1) {
        await fastify.redis.expire(dayKey, 86_400);
      }
      if (n > 3) {
        return replyFail(reply, 429, 'RATE_LIMIT', 'Вы уже отправляли запрос сегодня. Попробуйте завтра.');
      }

      const ruPhone = z
        .string()
        .trim()
        .regex(/^\+7\d{10}$/, 'Укажите телефон в формате +7 и 10 цифр');

      function eventDateOk(raw: string | undefined): boolean {
        if (!raw?.trim()) return true;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cmp = new Date(d);
        cmp.setHours(0, 0, 0, 0);
        return cmp >= today;
      }

      const body = z
        .union([
          z
            .object({
              role: z.literal('employer'),
              name: z.string().trim().min(2).max(200),
              phone: ruPhone,
              email: z.string().email().max(320),
              company: z.string().trim().max(500).optional(),
              companyName: z.string().trim().max(500).optional(),
              eventType: z.string().trim().min(1).max(200),
              eventDate: z.string().optional(),
              staffNeeded: z.string().trim().min(1).max(2000),
              quantity: z.coerce.number().int().min(1).max(10_000).optional(),
              message: z.string().max(8000).optional().default(''),
            })
            .superRefine((val, ctx) => {
              if (!(val.companyName?.trim() || val.company?.trim())) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: 'Укажите название компании',
                  path: ['companyName'],
                });
              }
              if (!eventDateOk(val.eventDate)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: 'Дата мероприятия не может быть в прошлом',
                  path: ['eventDate'],
                });
              }
              const composed = [val.staffNeeded, val.message?.trim()].filter(Boolean).join('\n\n');
              if (composed.length < 10) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: 'Опишите запрос или комментарий (не менее 10 символов суммарно)',
                  path: ['message'],
                });
              }
            }),
          z.object({
            role: z.literal('worker'),
            name: z.string().trim().min(2).max(200),
            phone: z.string().trim().min(5).max(40),
            email: z.string().email().max(320),
            position: z.string().trim().min(1).max(500),
            experience: z.string().trim().min(1).max(4000),
            availability: z.string().max(2000).optional(),
            message: z.string().trim().min(10).max(8000),
          }),
        ])
        .parse(request.body);

      const adminEmail = process.env.ADMIN_EMAIL?.trim();
      if (!adminEmail) {
        fastify.log.error('ADMIN_EMAIL is not set');
        return replyFail(reply, 503, 'CONFIG', 'Сервис временно недоступен');
      }

      const optionalUserId = await getOptionalUserId(request);
      let createdByUserId: string | null = null;
      if (optionalUserId && body.role === 'employer') {
        const u = await fastify.prisma.user.findUnique({
          where: { id: optionalUserId },
          select: { id: true, roles: { select: { role: true } } },
        });
        const isEmployer = u?.roles.some((r) => r.role === Role.employer);
        if (u && isEmployer) {
          createdByUserId = u.id;
        }
      }

      const eventDate =
        body.role === 'employer' && body.eventDate?.trim()
          ? (() => {
              const d = new Date(body.eventDate);
              return Number.isNaN(d.getTime()) ? null : d;
            })()
          : null;

      const companyStored =
        body.role === 'employer'
          ? (body.companyName?.trim() || body.company?.trim() || '')
          : null;

      const messageStored =
        body.role === 'employer'
          ? [body.staffNeeded.trim(), body.message?.trim()].filter(Boolean).join('\n\n')
          : body.message.trim();

      const created = await fastify.prisma.individualRequest.create({
        data: {
          role: body.role as Role,
          createdByUserId,
          name: body.name.trim(),
          phone: body.phone.trim(),
          email: body.email.trim().toLowerCase(),
          company: body.role === 'employer' ? companyStored : null,
          eventType: body.role === 'employer' ? body.eventType.trim() : null,
          eventDate: eventDate ?? undefined,
          staffNeeded: body.role === 'employer' ? body.staffNeeded.trim() : null,
          quantity: body.role === 'employer' ? body.quantity : null,
          position: body.role === 'worker' ? body.position.trim() : null,
          experience: body.role === 'worker' ? body.experience.trim() : null,
          availability: body.role === 'worker' ? body.availability?.trim() : null,
          message: messageStored,
        },
      });

      await fastify.prisma.adminAuditLog.create({
        data: {
          adminId: null,
          action: 'individual_request_created',
          entityType: 'individual_request',
          entityId: created.id,
          details: {
            role: body.role,
            createdByUserId,
            email: created.email,
          } as Prisma.InputJsonValue,
          ip: request.ip,
        },
      });

      const site = publicSiteUrl();
      const admins = await fastify.prisma.user.findMany({
        where: { roles: { some: { role: 'admin' } } },
        select: { id: true, email: true },
      });
      const regLabel =
        createdByUserId == null ? 'Гость / не авторизован' : `User ${createdByUserId}`;
      for (const a of admins) {
        await fastify.notificationService.create({
          userId: a.id,
          type: 'INDIVIDUAL_REQUEST',
          title: 'Персональная заявка',
          body: `${body.role}: ${body.name} — ${body.phone} (${regLabel})`,
          data: { requestId: created.id },
        });
      }
      await fastify.emailService.queue({
        userId: admins[0]?.id ?? null,
        to: adminEmail,
        type: 'INDIVIDUAL_REQUEST' as InAppNotificationType,
        templateData: {
          id: created.id,
          body: `Роль: ${body.role}\nИмя: ${body.name}\nТелефон: ${body.phone}\nEmail: ${body.email}\n` +
            (body.role === 'employer'
              ? `Компания: ${companyStored}\nТип мероприятия: ${body.eventType}\n`
              : `Должность: ${body.position}\n`) +
            `Комментарий: ${messageStored}`,
          ctaUrl: `${site}/admin/individual-requests/${created.id}`,
        },
      });
      return replyOk(
        reply,
        {
          id: created.id,
          status: created.status,
          createdAt: created.createdAt.toISOString(),
        },
        201,
      );
  });

  // POST /contact — public contact form
  fastify.post('/contact', async (request, reply) => {
    const dayKey = `contact_req:${request.ip}`;
    const n = await fastify.redis.incr(dayKey);
    if (n === 1) await fastify.redis.expire(dayKey, 86_400);
    if (n > 5) {
      return replyFail(reply, 429, 'RATE_LIMIT', 'Слишком много запросов сегодня. Попробуйте завтра.');
    }

    const body = z.object({
      name: z.string().trim().min(2, 'Укажите имя').max(200),
      email: z.string().email('Некорректный email').max(320),
      message: z.string().trim().min(10, 'Сообщение слишком короткое').max(4000),
    }).parse(request.body);

    const created = await fastify.prisma.contactRequest.create({
      data: {
        name: body.name,
        email: body.email.trim().toLowerCase(),
        message: body.message,
      },
    });

    // Notify all admins
    const admins = await fastify.prisma.user.findMany({
      where: { roles: { some: { role: 'admin' } } },
      select: { id: true },
    });
    for (const a of admins) {
      await fastify.notificationService.create({
        userId: a.id,
        type: 'INDIVIDUAL_REQUEST' as InAppNotificationType,
        title: 'Новое обращение с сайта',
        body: `${body.name} <${body.email}>`,
        data: { contactRequestId: created.id },
      });
    }

    return replyOk(reply, { id: created.id }, 201);
  });
};
