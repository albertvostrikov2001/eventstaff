import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Prisma, StaffCategory } from '@prisma/client';
import { workerProfileUpdateSchema } from '@unity/shared';
import { getUserRestriction, restrictedReply } from '@/lib/restriction';

export const workerRoutes: FastifyPluginAsync = async (fastify) => {
  const workerAuth = [
    fastify.authenticate,
    fastify.requireRole(['worker']),
  ];

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
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    return reply.send({ data: profile });
  });

  // PUT /profile
  fastify.put('/profile', { preHandler: workerAuth }, async (request, reply) => {
    const body = workerProfileUpdateSchema.parse(request.body);

    const existing = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });

    if (!existing) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
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
        return reply.status(400).send({
          error: {
            code: 'PROFILE_INCOMPLETE',
            message: 'Заполните все обязательные поля перед публикацией',
            details: { missingFields: missing, needsCategory: !hasCategories },
          },
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

    return reply.send({ data: updated });
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
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
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

    return reply.status(201).send({ data: category });
  });

  // GET /applications
  fastify.get('/applications', { preHandler: workerAuth }, async (request, reply) => {
    const query = z
      .object({ status: z.string().optional(), page: z.coerce.number().default(1) })
      .parse(request.query);

    const profile = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
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
        skip: (query.page - 1) * 20,
        take: 20,
      }),
    ]);

    return reply.send({
      data: applications,
      meta: { total, page: query.page, limit: 20, totalPages: Math.ceil(total / 20) },
    });
  });

  // POST /applications
  fastify.post('/applications', { preHandler: workerAuth }, async (request, reply) => {
    const body = z
      .object({ vacancyId: z.string(), coverMessage: z.string().optional() })
      .parse(request.body);

    const rest = await getUserRestriction(fastify.prisma, request.jwtUser.sub);
    if (rest.restricted) {
      return reply.status(restrictedReply().status).send(restrictedReply().body);
    }

    const profile = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    const vacancy = await fastify.prisma.vacancy.findUnique({ where: { id: body.vacancyId } });
    if (!vacancy) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Vacancy not found' } });
    }
    if (vacancy.status !== 'active') {
      return reply
        .status(400)
        .send({ error: { code: 'INVALID_STATUS', message: 'Вакансия не активна' } });
    }

    const existing = await fastify.prisma.application.findUnique({
      where: { vacancyId_workerId: { vacancyId: body.vacancyId, workerId: profile.id } },
    });
    if (existing) {
      return reply
        .status(409)
        .send({ error: { code: 'DUPLICATE', message: 'Вы уже откликнулись на эту вакансию' } });
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
      const site =
        process.env.PUBLIC_SITE_URL?.replace(/\/$/, '') ||
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
        'http://localhost:3000';
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

    return reply.status(201).send({ data: application });
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

    return reply.send({ data: vacancies });
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

    return reply.status(201).send({ data: { success: true } });
  });

  // DELETE /favorites/vacancies/:vacancyId
  fastify.delete('/favorites/vacancies/:vacancyId', { preHandler: workerAuth }, async (request, reply) => {
    const { vacancyId } = request.params as { vacancyId: string };

    await fastify.prisma.favorite.deleteMany({
      where: { userId: request.jwtUser.sub, targetId: vacancyId, type: 'vacancy' },
    });

    return reply.send({ data: { success: true } });
  });

  // GET /availability
  fastify.get('/availability', { preHandler: workerAuth }, async (request, reply) => {
    const query = z.object({ month: z.string().optional() }).parse(request.query);

    const profile = await fastify.prisma.workerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
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

    return reply.send({ data: slots });
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
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    // TODO: интеграция с Application booking — следующий этап

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

    return reply.send({ data: { success: true } });
  });
};
