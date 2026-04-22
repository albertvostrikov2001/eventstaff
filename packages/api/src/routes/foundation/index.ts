import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  ComplaintTargetType,
  ComplaintType,
  ShiftStatus,
  Role,
  type InAppNotificationType,
} from '@prisma/client';
import { publicSiteUrl } from '@/lib/public-site-url';
import { ReliabilityService } from '@/services/reliability-service';
import { ensureShiftForBooking } from '@/lib/ensure-booking-shift';
import { paginationSchema } from '@unity/shared';
import { ReviewAccessService } from '@/services/review-access-service';
import { getOptionalUserId } from '@/lib/optional-jwt';

const stub = () => ({ success: true, data: null, message: 'Not implemented' as const });

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
    return reply.send({ data: list });
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
      return reply
        .status(400)
        .send({ error: { code: 'INVALID', message: 'Нельзя пожаловаться на самого себя' } });
    }
    const count = await fastify.prisma.complaint.count({
      where: {
        authorId: request.jwtUser.sub,
        targetId: body.targetId,
        targetType: body.targetType,
      },
    });
    if (count >= 3) {
      return reply.status(400).send({
        error: { code: 'LIMIT', message: 'Уже 3 жалобы на эту сущность' },
      });
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

    return reply.status(201).send({ data: complaint });
  });

  // GET /reliability/me — до /reliability/:userId
  fastify.get('/reliability/me', { preHandler: auth }, async (request, reply) => {
    const row = await fastify.prisma.userReliabilityScore.upsert({
      where: { userId: request.jwtUser.sub },
      create: { userId: request.jwtUser.sub },
      update: {},
    });
    return reply.send({ data: row });
  });

  // GET /reliability/:userId
  fastify.get<{ Params: { userId: string } }>('/reliability/:userId', async (request, reply) => {
    const { userId } = request.params;
    if (userId === 'me') {
      return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
    }
    const row = await fastify.prisma.userReliabilityScore.findUnique({
      where: { userId },
    });
    if (!row) {
      return reply.send({
        data: { score: 100, level: 'NEW', totalShifts: 0, isRestricted: false },
      });
    }
    return reply.send({ data: row });
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
        return reply.status(403).send({
          error: {
            code: 'LIMIT_EXCEEDED',
            message: 'Достигнут лимит просмотра профилей',
            remaining: 0,
            upgradeTo: gate.upgradeTo,
          },
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
    return reply.send({
      data: rows,
      meta: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) },
    });
  });

  // GET /user/review-usage
  fastify.get('/user/review-usage', { preHandler: auth }, async (request, reply) => {
    const s = new ReviewAccessService(fastify.prisma);
    const u = await s.getUsage(request.jwtUser.sub);
    return reply.send({ data: u });
  });

  fastify.get<{ Params: { id: string } }>('/shifts/:id', { preHandler: auth }, async (request, reply) => {
    const { id } = request.params;
    const shift = await fastify.prisma.shift.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            linkedVacancy: true,
            worker: { include: { user: true } },
            employer: { include: { user: true } },
          },
        },
      },
    });
    if (!shift) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Shift not found' } });
    }
    const uid = request.jwtUser.sub;
    if (shift.workerId !== uid && shift.employerId !== uid) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'No access' } });
    }
    return reply.send({ data: shift });
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
        worker: { include: { user: true } },
        employer: { include: { user: true } },
      },
    });
    if (!booking) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Заказ не найден' } });
    }
    const isWorker = booking.worker.userId === uid;
    const isEmployer = booking.employer.userId === uid;
    if (!isWorker && !isEmployer) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Нет доступа' } });
    }
    const role: Role = isWorker ? 'worker' : 'employer';
    const start = combineBookingDateTime(booking.date, booking.timeStart);
    const now = new Date();
    if (now >= start) {
      return reply
        .status(400)
        .send({ error: { code: 'LATE', message: 'Смена уже началась — отмена невозможна' } });
    }
    if (start.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      return reply
        .status(400)
        .send({ error: { code: 'TOO_LATE', message: 'Отмена возможна не позднее чем за 24 часа до начала' } });
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
      return reply
        .status(400)
        .send({ error: { code: 'INVALID', message: 'Неизвестный код причины' } });
    }
    if ((body.reasonCode === 'other' || codeNorm.includes('OTHER')) && !body.customReason?.trim()) {
      return reply
        .status(400)
        .send({ error: { code: 'INVALID', message: 'Укажите причину' } });
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
    return reply.send({ data: updated });
  };

  fastify.post<{ Params: { id: string } }>('/bookings/:id/cancel', { preHandler: auth }, cancelOrderHandler);
  fastify.post<{ Params: { id: string } }>('/orders/:id/cancel', { preHandler: auth }, cancelOrderHandler);

  // POST /individual-requests — публичный, rate limit 3/сутки с IP
  fastify.post('/individual-requests', async (request, reply) => {
      const dayKey = `individual_req:${request.ip}`;
      const n = await fastify.redis.incr(dayKey);
      if (n === 1) {
        await fastify.redis.expire(dayKey, 86_400);
      }
      if (n > 3) {
        return reply.status(429).send({
          error: { code: 'RATE_LIMIT', message: 'Слишком много заявок. Попробуйте завтра.' },
        });
      }
      const body = z
        .discriminatedUnion('role', [
          z.object({
            role: z.literal('employer'),
            name: z.string().min(2).max(200),
            phone: z.string().min(5).max(40),
            email: z.string().email().max(320),
            company: z.string().min(1).max(500),
            eventType: z.string().min(1).max(200),
            eventDate: z.string().optional(),
            staffNeeded: z.string().min(1).max(2000),
            quantity: z.coerce.number().int().min(1).max(10_000).optional(),
            message: z.string().min(1).max(8000),
          }),
          z.object({
            role: z.literal('worker'),
            name: z.string().min(2).max(200),
            phone: z.string().min(5).max(40),
            email: z.string().email().max(320),
            position: z.string().min(1).max(500),
            experience: z.string().min(1).max(4000),
            availability: z.string().max(2000).optional(),
            message: z.string().min(1).max(8000),
          }),
        ])
        .parse(request.body);
      const adminEmail = process.env.ADMIN_EMAIL?.trim();
      if (!adminEmail) {
        fastify.log.error('ADMIN_EMAIL is not set');
        return reply.status(503).send({ error: { code: 'CONFIG', message: 'Сервис временно недоступен' } });
      }
      const eventDate =
        body.role === 'employer' && body.eventDate
          ? (() => {
              const d = new Date(body.eventDate);
              return Number.isNaN(d.getTime()) ? null : d;
            })()
          : null;
      const created = await fastify.prisma.individualRequest.create({
        data: {
          role: body.role as Role,
          name: body.name,
          phone: body.phone,
          email: body.email,
          company: body.role === 'employer' ? body.company : null,
          eventType: body.role === 'employer' ? body.eventType : null,
          eventDate: eventDate ?? undefined,
          staffNeeded: body.role === 'employer' ? body.staffNeeded : null,
          quantity: body.role === 'employer' ? body.quantity : null,
          position: body.role === 'worker' ? body.position : null,
          experience: body.role === 'worker' ? body.experience : null,
          availability: body.role === 'worker' ? body.availability : null,
          message: body.message,
        },
      });
      const site = publicSiteUrl();
      const admins = await fastify.prisma.user.findMany({
        where: { roles: { some: { role: 'admin' } } },
        select: { id: true, email: true },
      });
      for (const a of admins) {
        await fastify.notificationService.create({
          userId: a.id,
          type: 'INDIVIDUAL_REQUEST',
          title: 'Персональная заявка',
          body: `${body.role}: ${body.name} — ${body.phone}`,
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
              ? `Компания: ${body.company}\nТип мероприятия: ${body.eventType}\n`
              : `Должность: ${body.position}\n`) +
            `Комментарий: ${body.message}`,
          ctaUrl: `${site}/admin/individual-requests/${created.id}`,
        },
      });
      return reply.status(201).send({ data: { id: created.id } });
  });
};
