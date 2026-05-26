import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { BookingStatus, Prisma, ShiftStatus, StaffCategory } from '@prisma/client';
import { workerProfileUpdateSchema } from '@unity/shared';
import { getUserRestriction, restrictedReply } from '@/lib/restriction';
import { publicSiteUrl } from '@/lib/public-site-url';
import { replyFail, replyOk, replyPaginated } from '../../lib/api-reply';
import { findWorkerScheduleConflicts } from '@/lib/worker-schedule-conflict';
import { SubscriptionService } from '@/services/subscription-service';

export const workerRoutes: FastifyPluginAsync = async (fastify) => {
  const workerAuth = [
    fastify.authenticate,
    fastify.requireRole(['worker']),
  ];
  const subSvc = new SubscriptionService(fastify.prisma);

  // GET /dashboard/summary
  fastify.get('/dashboard/summary', { preHandler: workerAuth }, async (request, reply) => {
    const uid = request.jwtUser.sub;
    const worker = await fastify.prisma.workerProfile.findUnique({
      where: { userId: uid },
      select: { id: true },
    });
    if (!worker) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const [applicationsCount, activeShiftsCount, pendingInvitationsCount] = await Promise.all([
      fastify.prisma.application.count({ where: { workerId: worker.id } }),
      fastify.prisma.shift.count({
        where: { workerId: uid, status: { in: [ShiftStatus.PENDING, ShiftStatus.ACTIVE, ShiftStatus.DISPUTED] } },
      }),
      fastify.prisma.application.count({
        where: { workerId: worker.id, status: 'invited' },
      }),
    ]);

    return replyOk(reply, {
      applicationsCount,
      activeShiftsCount,
      pendingInvitationsCount,
    });
  });

  // GET /profile
  fastify.get('/profile', { preHandler: workerAuth }, async (request, reply) => {
    const profile = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      include: {
        city: true,
        categories: true,
      },
    });

    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    return replyOk(reply, profile);
  });

  // PUT /profile
  fastify.put('/profile', { preHandler: workerAuth }, async (request, reply) => {
    const body = workerProfileUpdateSchema.parse(request.body);

    const existing = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });

    if (!existing) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    if (body.visibility === 'public') {
      const requiredFields = ['firstName', 'lastName', 'cityId', 'desiredRate'] as const;
      const currentData = { ...existing, ...body };
      const missing = requiredFields.filter(
        (f) => !currentData[f as keyof typeof currentData],
      );
      const hasCategories = await fastify.prisma.workerCategory.count({
        where: { workerId: existing.id },
      });
      if (missing.length > 0 || !hasCategories) {
        return replyFail(reply, 400, 'PROFILE_INCOMPLETE', 'Заполните все обязательные поля перед публикацией', {
          missingFields: missing,
          needsCategory: !hasCategories,
        });
      }
    }

    const updated = await fastify.prisma.workerProfile.update({
      where: { userId: request.jwtUser.sub },
      data: {
        ...(body.firstName !== undefined && { firstName: body.firstName }),
        ...(body.lastName !== undefined && { lastName: body.lastName }),
        ...(body.age !== undefined && { age: body.age }),
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.experienceYears !== undefined && { experienceYears: body.experienceYears }),
        ...(body.hasMedicalBook !== undefined && { hasMedicalBook: body.hasMedicalBook }),
        ...(body.desiredRate !== undefined && { desiredRate: body.desiredRate }),
        ...(body.rateType !== undefined && { rateType: body.rateType }),
        ...(body.willingToTravel !== undefined && { willingToTravel: body.willingToTravel }),
        ...(body.overtimeReady !== undefined && { overtimeReady: body.overtimeReady }),
        ...(body.visibility !== undefined && { visibility: body.visibility }),
        ...(body.cityId !== undefined && { cityId: body.cityId }),
        ...(body.languages !== undefined && { languages: body.languages }),
        ...(body.dressSizes !== undefined && { dressSizes: body.dressSizes }),
        ...(body.readyForTrips !== undefined && { readyForTrips: body.readyForTrips }),
        ...(body.readyForOvertime !== undefined && { readyForOvertime: body.readyForOvertime }),
      },
      include: { city: true, categories: true },
    });

    return replyOk(reply, updated);
  });

  // GET /shifts
  fastify.get('/shifts', { preHandler: workerAuth }, async (request, reply) => {
    const query = z
      .object({
        status: z.enum(['active', 'completed', 'cancelled']).optional(),
        page: z.coerce.number().int().positive().default(1),
      })
      .parse(request.query);

    const uid = request.jwtUser.sub;
    const limit = 20;

    const statusMap: Record<string, ShiftStatus[]> = {
      active: [ShiftStatus.PENDING, ShiftStatus.ACTIVE, ShiftStatus.DISPUTED],
      completed: [ShiftStatus.COMPLETED, ShiftStatus.FAILED],
      cancelled: [ShiftStatus.CANCELLED],
    };

    const where: Prisma.ShiftWhereInput = {
      workerId: uid,
      ...(query.status ? { status: { in: statusMap[query.status] } } : {}),
    };

    const [total, shifts] = await fastify.prisma.$transaction([
      fastify.prisma.shift.count({ where }),
      fastify.prisma.shift.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * limit,
        take: limit,
        include: {
          booking: {
            include: {
              linkedVacancy: { select: { id: true, title: true, dateStart: true, address: true } },
              employer: { select: { companyName: true, contactName: true, logoUrl: true } },
            },
          },
          reviews: { select: { id: true, reviewerId: true } },
          payments: { select: { id: true, status: true, amount: true } },
        },
      }),
    ]);

    return replyPaginated(reply, shifts, {
      total,
      page: query.page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  });

  // POST /categories — add a category
  fastify.post('/categories', { preHandler: workerAuth }, async (request, reply) => {
    const body = z
      .object({
        category: z.string(),
        specialization: z.string().optional(),
        level: z.enum(['beginner', 'experienced', 'expert']).optional(),
      })
      .parse(request.body);

    const profile = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const category = await fastify.prisma.workerCategory.upsert({
      where: {
        workerId_category: {
          workerId: profile.id,
          category: body.category as StaffCategory,
        },
      },
      create: {
        workerId: profile.id,
        category: body.category as Parameters<typeof fastify.prisma.workerCategory.create>[0]['data']['category'],
        specialization: body.specialization,
        level: (body.level ?? 'beginner') as Parameters<typeof fastify.prisma.workerCategory.create>[0]['data']['level'],
      },
      update: {
        specialization: body.specialization,
        level: body.level as Parameters<typeof fastify.prisma.workerCategory.update>[0]['data']['level'],
      },
    });

    return replyOk(reply, category, 201);
  });

  // DELETE /categories/:id — remove a worker category
  fastify.delete('/categories/:id', { preHandler: workerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const profile = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const cat = await fastify.prisma.workerCategory.findFirst({
      where: { id, workerId: profile.id },
    });
    if (!cat) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Category not found');
    }

    await fastify.prisma.workerCategory.delete({ where: { id } });
    return replyOk(reply, { success: true });
  });

  // PATCH /applications/:id/respond — worker accepts or declines invitation
  fastify.patch('/applications/:id/respond', { preHandler: workerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        action: z.enum(['ACCEPT', 'DECLINE']),
        message: z.string().max(500).optional(),
        acknowledgeConflict: z.boolean().optional(),
      })
      .parse(request.body);

    const profile = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const application = await fastify.prisma.application.findUnique({
      where: { id },
      include: {
        vacancy: {
          include: { employer: { include: { user: { select: { id: true, email: true } } } } },
        },
      },
    });

    if (!application) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Invitation not found');
    }
    if (application.workerId !== profile.id) {
      return replyFail(reply, 403, 'FORBIDDEN', 'No access');
    }
    if (application.status !== 'invited') {
      return replyFail(reply, 400, 'INVALID_STATE', 'Приглашение уже обработано');
    }

    if (body.action === 'ACCEPT') {
      const conflicts = await findWorkerScheduleConflicts(
        fastify.prisma,
        request.jwtUser.sub,
        application.vacancy.dateStart,
      );
      if (conflicts.length > 0 && !body.acknowledgeConflict) {
        const dateLabel = application.vacancy.dateStart.toLocaleDateString('ru-RU');
        return replyFail(
          reply,
          409,
          'SCHEDULE_CONFLICT',
          `На ${dateLabel} у вас уже есть смена. Подтвердите, что хотите принять приглашение.`,
          { conflicts },
        );
      }
    }

    const newStatus = body.action === 'ACCEPT' ? 'confirmed' : 'rejected';
    const updated = await fastify.prisma.application.update({
      where: { id },
      data: { status: newStatus },
    });

    // When worker accepts invitation → auto-create Booking + Shift if not yet existing
    if (body.action === 'ACCEPT') {
      const v = application.vacancy;
      const existingBooking = await fastify.prisma.booking.findFirst({
        where: { linkedVacancyId: v.id, workerId: profile.id },
      });
      if (!existingBooking) {
        const booking = await fastify.prisma.booking.create({
          data: {
            employerId: v.employer.id,
            workerId: profile.id,
            linkedVacancyId: v.id,
            date: v.dateStart,
            timeStart: v.timeStart ?? null,
            timeEnd: v.timeEnd ?? null,
            location: v.address ?? null,
            rate: v.rate,
            description: v.title,
            status: BookingStatus.confirmed,
          },
        });
        await fastify.prisma.shift.create({
          data: {
            bookingId: booking.id,
            workerId: request.jwtUser.sub,
            employerId: v.employer.userId,
            status: ShiftStatus.PENDING,
          },
        });
      }
    }

    const employerUserId = application.vacancy.employer.user?.id;
    if (employerUserId) {
      const workerName = `${profile.firstName} ${profile.lastName}`.trim() || 'Работник';
      await fastify.notificationService.create({
        userId: employerUserId,
        type: 'APPLICATION_RESPONSE',
        title: body.action === 'ACCEPT' ? 'Приглашение принято' : 'Приглашение отклонено',
        body: `${workerName} ${body.action === 'ACCEPT' ? 'принял' : 'отклонил'} приглашение на «${application.vacancy.title}»`,
        data: { applicationId: id, vacancyId: application.vacancyId },
      });
    }

    return replyOk(reply, updated);
  });

  // GET /applications
  fastify.get('/applications', { preHandler: workerAuth }, async (request, reply) => {
    const query = z
      .object({
        status: z.string().optional(),
        page: z.coerce.number().default(1),
        limit: z.coerce.number().min(1).max(200).default(20),
      })
      .parse(request.query);

    const profile = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const where: Prisma.ApplicationWhereInput = {
      workerId: profile.id,
      ...(query.status ? { status: query.status as Prisma.ApplicationWhereInput['status'] } : {}),
    };

    const [total, applications] = await fastify.prisma.$transaction([
      fastify.prisma.application.count({ where }),
      fastify.prisma.application.findMany({
        where,
        include: {
          vacancy: {
            include: {
              employer: { select: { id: true, companyName: true, isVerified: true, logoUrl: true } },
              city: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return replyPaginated(reply, applications, {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    });
  });

  // POST /applications
  fastify.post('/applications', { preHandler: workerAuth }, async (request, reply) => {
    const body = z
      .object({
        vacancyId: z.string(),
        coverMessage: z.string().optional(),
        acknowledgeConflict: z.boolean().optional(),
      })
      .parse(request.body);

    const rest = await getUserRestriction(fastify.prisma, request.jwtUser.sub);
    if (rest.restricted) {
      const r = restrictedReply();
      return replyFail(reply, r.status, r.body.error.code, r.body.error.message);
    }

    const profile = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    // ── Application limit check ──
    const canApply = await subSvc.canWorkerApply(profile.id);
    if (!canApply.allowed) {
      return replyFail(
        reply,
        403,
        'APPLICATION_LIMIT_REACHED',
        `Вы исчерпали лимит откликов на этот месяц (${canApply.limit}). Перейдите на Premium для безлимитных откликов.`,
        { used: canApply.used, limit: canApply.limit, plan: canApply.plan },
      );
    }

    const vacancy = await fastify.prisma.vacancy.findUnique({ where: { id: body.vacancyId } });
    if (!vacancy) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Vacancy not found');
    }
    if (vacancy.status !== 'active') {
      return replyFail(reply, 400, 'INVALID_STATUS', 'Вакансия не активна');
    }

    const existing = await fastify.prisma.application.findUnique({
      where: { vacancyId_workerId: { vacancyId: body.vacancyId, workerId: profile.id } },
    });
    if (existing) {
      return replyFail(reply, 409, 'DUPLICATE', 'Вы уже откликнулись на эту вакансию');
    }

    const conflicts = await findWorkerScheduleConflicts(
      fastify.prisma,
      request.jwtUser.sub,
      vacancy.dateStart,
    );
    if (conflicts.length > 0 && !body.acknowledgeConflict) {
      const dateLabel = vacancy.dateStart.toLocaleDateString('ru-RU');
      return replyFail(
        reply,
        409,
        'SCHEDULE_CONFLICT',
        `На ${dateLabel} у вас уже запланирована смена. Вы можете откликнуться, но убедитесь, что сможете выйти на работу.`,
        { conflicts },
      );
    }

    const application = await fastify.prisma.application.create({
      data: {
        vacancyId: body.vacancyId,
        workerId: profile.id,
        coverMessage: body.coverMessage,
        status: 'pending',
      },
    });

    const vacancyFull = await fastify.prisma.vacancy.findUnique({
      where: { id: body.vacancyId },
      include: { employer: { include: { user: { select: { id: true, email: true } } } } },
    });
    if (vacancyFull?.employer.user) {
      const employerUser = vacancyFull.employer.user;
      const site = publicSiteUrl();
      const workerName = `${profile.firstName} ${profile.lastName}`.trim();
      const workerProfileBits =
        profile.bio?.trim().slice(0, 220) || 'Откройте кабинет, чтобы увидеть профиль исполнителя.';

      await fastify.notificationService.create({
        userId: employerUser.id,
        type: 'APPLICATION_RECEIVED',
        title: 'Новый отклик',
        body: `${workerName} откликнулся на «${vacancyFull.title}»`,
        data: { applicationId: application.id, workerId: profile.id },
      });

      if (employerUser.email) {
        await fastify.emailService.queue({
          userId: employerUser.id,
          to: employerUser.email,
          type: 'APPLICATION_RECEIVED',
          templateData: {
            workerName,
            vacancyTitle: vacancyFull.title,
            workerProfile: workerProfileBits || 'Откройте кабинет, чтобы увидеть профиль.',
            ctaUrl: `${site}/employer/vacancies/${vacancyFull.id}/applications`,
          },
        });
      }
    }

    return replyOk(reply, application, 201);
  });

  // GET /favorites/vacancies
  fastify.get('/favorites/vacancies', { preHandler: workerAuth }, async (request, reply) => {
    const favorites = await fastify.prisma.favorite.findMany({
      where: { userId: request.jwtUser.sub, type: 'vacancy' },
      orderBy: { createdAt: 'desc' },
    });

    const vacancyIds = favorites.map((f) => f.targetId);
    const vacancies = await fastify.prisma.vacancy.findMany({
      where: { id: { in: vacancyIds } },
      include: {
        employer: { select: { id: true, companyName: true, isVerified: true, logoUrl: true } },
        city: true,
      },
    });

    return replyOk(reply, vacancies);
  });

  // POST /favorites/vacancies/:vacancyId
  fastify.post('/favorites/vacancies/:vacancyId', { preHandler: workerAuth }, async (request, reply) => {
    const { vacancyId } = request.params as { vacancyId: string };

    await fastify.prisma.favorite.upsert({
      where: {
        userId_targetId_type: {
          userId: request.jwtUser.sub,
          targetId: vacancyId,
          type: 'vacancy',
        },
      },
      create: { userId: request.jwtUser.sub, targetId: vacancyId, type: 'vacancy' },
      update: {},
    });

    return replyOk(reply, { success: true }, 201);
  });

  // DELETE /favorites/vacancies/:vacancyId
  fastify.delete('/favorites/vacancies/:vacancyId', { preHandler: workerAuth }, async (request, reply) => {
    const { vacancyId } = request.params as { vacancyId: string };

    await fastify.prisma.favorite.deleteMany({
      where: { userId: request.jwtUser.sub, targetId: vacancyId, type: 'vacancy' },
    });

    return replyOk(reply, { success: true });
  });

  // GET /availability
  fastify.get('/availability', { preHandler: workerAuth }, async (request, reply) => {
    const query = z.object({ month: z.string().optional() }).parse(request.query);

    const profile = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    let where: Prisma.WorkerAvailabilityWhereInput = {
      workerId: profile.id,
    };

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0);
      where = { ...where, date: { gte: from, lte: to } };
    }

    const slots = await fastify.prisma.workerAvailability.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    return replyOk(reply, slots);
  });

  // POST /availability
  fastify.post('/availability', { preHandler: workerAuth }, async (request, reply) => {
    const body = z
      .object({
        slots: z.array(
          z.object({ date: z.string(), isAvailable: z.boolean() }),
        ),
      })
      .parse(request.body);

    const profile = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    // BACKLOG: интеграция с Booking — см. BACKLOG.md

    await fastify.prisma.$transaction(
      body.slots.map((slot) =>
        fastify.prisma.workerAvailability.upsert({
          where: { workerId_date: { workerId: profile.id, date: new Date(slot.date) } },
          create: {
            workerId: profile.id,
            date: new Date(slot.date),
            isBlocked: !slot.isAvailable,
          },
          update: { isBlocked: !slot.isAvailable },
        }),
      ),
    );

    return replyOk(reply, { success: true });
  });

  // GET /reviews — отзывы о текущем работнике (после смен)
  fastify.get('/reviews', { preHandler: workerAuth }, async (request, reply) => {
    const reviews = await fastify.prisma.shiftReview.findMany({
      where: { revieweeId: request.jwtUser.sub },
      include: {
        reviewer: {
          select: {
            id: true,
            employerProfile: {
              select: { companyName: true, contactName: true, logoUrl: true },
            },
          },
        },
        shift: {
          select: {
            createdAt: true,
            booking: {
              select: {
                date: true,
                linkedVacancy: { select: { title: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return replyOk(reply, reviews);
  });
};
