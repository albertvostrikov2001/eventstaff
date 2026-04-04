import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { employerProfileUpdateSchema, vacancyCreateSchema } from '@unity/shared';

export const employerRoutes: FastifyPluginAsync = async (fastify) => {
  const employerAuth = [
    fastify.authenticate,
    fastify.requireRole(['employer']),
  ];

  // GET /profile
  fastify.get('/profile', { preHandler: employerAuth }, async (request, reply) => {
    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      include: { city: true },
    });
    if (!profile) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }
    return reply.send({ data: profile });
  });

  // PUT /profile
  fastify.put('/profile', { preHandler: employerAuth }, async (request, reply) => {
    const body = employerProfileUpdateSchema.parse(request.body);

    const updated = await fastify.prisma.employerProfile.update({
      where: { userId: request.jwtUser.sub },
      data: {
        ...(body.type !== undefined && { type: body.type }),
        ...(body.companyName !== undefined && { companyName: body.companyName }),
        ...(body.contactName !== undefined && { contactName: body.contactName }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.businessType !== undefined && { businessType: body.businessType }),
        ...(body.website !== undefined && { website: body.website }),
        ...(body.cityId !== undefined && { cityId: body.cityId }),
      },
      include: { city: true },
    });

    return reply.send({ data: updated });
  });

  // GET /vacancies
  fastify.get('/vacancies', { preHandler: employerAuth }, async (request, reply) => {
    const query = z
      .object({
        status: z.string().optional(),
        page: z.coerce.number().default(1),
      })
      .parse(request.query);

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    const where = {
      employerId: profile.id,
      ...(query.status ? { status: query.status as Parameters<typeof fastify.prisma.vacancy.findMany>[0]['where']['status'] } : {}),
    };

    const [total, vacancies] = await fastify.prisma.$transaction([
      fastify.prisma.vacancy.count({ where }),
      fastify.prisma.vacancy.findMany({
        where,
        include: {
          city: true,
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * 20,
        take: 20,
      }),
    ]);

    return reply.send({
      data: vacancies,
      meta: { total, page: query.page, limit: 20, totalPages: Math.ceil(total / 20) },
    });
  });

  // POST /vacancies
  fastify.post('/vacancies', { preHandler: employerAuth }, async (request, reply) => {
    const body = vacancyCreateSchema.parse(request.body);

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    const statusVal = (request.body as Record<string, unknown>).status as string | undefined;

    const vacancy = await fastify.prisma.vacancy.create({
      data: {
        employerId: profile.id,
        title: body.title,
        category: body.category as Parameters<typeof fastify.prisma.vacancy.create>[0]['data']['category'],
        specialization: body.specialization,
        eventType: body.eventType as Parameters<typeof fastify.prisma.vacancy.create>[0]['data']['eventType'],
        venueLevel: body.venueLevel,
        rate: body.rate,
        rateType: body.rateType as Parameters<typeof fastify.prisma.vacancy.create>[0]['data']['rateType'],
        employmentType: body.employmentType as Parameters<typeof fastify.prisma.vacancy.create>[0]['data']['employmentType'],
        dateStart: new Date(body.dateStart),
        dateEnd: body.dateEnd ? new Date(body.dateEnd) : undefined,
        timeStart: body.timeStart,
        timeEnd: body.timeEnd,
        address: body.address,
        workersNeeded: body.workersNeeded,
        dressCode: body.dressCode,
        experienceRequired: body.experienceRequired,
        responsibilities: body.responsibilities,
        requirements: body.requirements,
        conditions: body.conditions,
        description: body.description,
        foodProvided: body.foodProvided,
        transportProvided: body.transportProvided,
        tipsPossible: body.tipsPossible,
        isUrgent: body.isUrgent,
        cityId: body.cityId,
        status: (statusVal === 'active' ? 'active' : 'draft') as Parameters<typeof fastify.prisma.vacancy.create>[0]['data']['status'],
        ...(statusVal === 'active' ? { publishedAt: new Date() } : {}),
      },
      include: { city: true },
    });

    return reply.status(201).send({ data: vacancy });
  });

  // GET /vacancies/:id
  fastify.get('/vacancies/:id', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    const vacancy = await fastify.prisma.vacancy.findFirst({
      where: { id, employerId: profile.id },
      include: { city: true, _count: { select: { applications: true } } },
    });

    if (!vacancy) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Vacancy not found' } });
    }

    return reply.send({ data: vacancy });
  });

  // PUT /vacancies/:id
  fastify.put('/vacancies/:id', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = vacancyCreateSchema.partial().parse(request.body);

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    const vacancy = await fastify.prisma.vacancy.findFirst({
      where: { id, employerId: profile.id },
    });
    if (!vacancy) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Vacancy not found' } });
    }

    const statusVal = (request.body as Record<string, unknown>).status as string | undefined;

    const updated = await fastify.prisma.vacancy.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.category !== undefined && { category: body.category as Parameters<typeof fastify.prisma.vacancy.update>[0]['data']['category'] }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.rate !== undefined && { rate: body.rate }),
        ...(body.rateType !== undefined && { rateType: body.rateType as Parameters<typeof fastify.prisma.vacancy.update>[0]['data']['rateType'] }),
        ...(body.employmentType !== undefined && { employmentType: body.employmentType as Parameters<typeof fastify.prisma.vacancy.update>[0]['data']['employmentType'] }),
        ...(body.eventType !== undefined && { eventType: body.eventType as Parameters<typeof fastify.prisma.vacancy.update>[0]['data']['eventType'] }),
        ...(body.dateStart !== undefined && { dateStart: new Date(body.dateStart) }),
        ...(body.dateEnd !== undefined && { dateEnd: new Date(body.dateEnd) }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.workersNeeded !== undefined && { workersNeeded: body.workersNeeded }),
        ...(body.responsibilities !== undefined && { responsibilities: body.responsibilities }),
        ...(body.requirements !== undefined && { requirements: body.requirements }),
        ...(body.conditions !== undefined && { conditions: body.conditions }),
        ...(body.foodProvided !== undefined && { foodProvided: body.foodProvided }),
        ...(body.transportProvided !== undefined && { transportProvided: body.transportProvided }),
        ...(body.isUrgent !== undefined && { isUrgent: body.isUrgent }),
        ...(body.cityId !== undefined && { cityId: body.cityId }),
        ...(statusVal !== undefined && {
          status: statusVal as Parameters<typeof fastify.prisma.vacancy.update>[0]['data']['status'],
          ...(statusVal === 'active' && vacancy.status !== 'active' ? { publishedAt: new Date() } : {}),
        }),
      },
      include: { city: true },
    });

    return reply.send({ data: updated });
  });

  // PATCH /vacancies/:id/archive
  fastify.patch('/vacancies/:id/archive', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    const vacancy = await fastify.prisma.vacancy.findFirst({
      where: { id, employerId: profile.id },
    });
    if (!vacancy) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Vacancy not found' } });
    }

    const updated = await fastify.prisma.vacancy.update({
      where: { id },
      data: { status: 'archived' },
    });

    return reply.send({ data: updated });
  });

  // GET /vacancies/:id/applications
  fastify.get('/vacancies/:id/applications', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    const vacancy = await fastify.prisma.vacancy.findFirst({
      where: { id, employerId: profile.id },
    });
    if (!vacancy) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Vacancy not found' } });
    }

    const applications = await fastify.prisma.application.findMany({
      where: { vacancyId: id },
      include: {
        worker: {
          include: {
            city: true,
            categories: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ data: applications });
  });

  // PATCH /applications/:id/status
  fastify.patch('/applications/:id/status', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({ status: z.enum(['confirmed', 'rejected', 'invited', 'cancelled']) })
      .parse(request.body);

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    const application = await fastify.prisma.application.findFirst({
      where: { id },
      include: { vacancy: true },
    });
    if (!application || application.vacancy.employerId !== profile.id) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Application not found' } });
    }

    const updated = await fastify.prisma.application.update({
      where: { id },
      data: { status: body.status as Parameters<typeof fastify.prisma.application.update>[0]['data']['status'] },
    });

    return reply.send({ data: updated });
  });

  // POST /invite — employer invites worker to vacancy
  fastify.post('/invite', { preHandler: employerAuth }, async (request, reply) => {
    const body = z
      .object({ workerId: z.string(), vacancyId: z.string() })
      .parse(request.body);

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    const vacancy = await fastify.prisma.vacancy.findFirst({
      where: { id: body.vacancyId, employerId: profile.id },
    });
    if (!vacancy) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Vacancy not found' } });
    }

    const existing = await fastify.prisma.application.findUnique({
      where: {
        vacancyId_workerId: { vacancyId: body.vacancyId, workerId: body.workerId },
      },
    });
    if (existing) {
      return reply
        .status(409)
        .send({ error: { code: 'DUPLICATE', message: 'Приглашение уже отправлено' } });
    }

    const application = await fastify.prisma.application.create({
      data: {
        vacancyId: body.vacancyId,
        workerId: body.workerId,
        status: 'invited',
      },
    });

    return reply.status(201).send({ data: application });
  });

  // GET /favorites/workers
  fastify.get('/favorites/workers', { preHandler: employerAuth }, async (request, reply) => {
    const favorites = await fastify.prisma.favorite.findMany({
      where: { userId: request.jwtUser.sub, type: 'worker' },
      orderBy: { createdAt: 'desc' },
    });

    const workerIds = favorites.map((f) => f.targetId);
    const workers = await fastify.prisma.workerProfile.findMany({
      where: { id: { in: workerIds } },
      include: { city: true, categories: true },
    });

    return reply.send({ data: workers });
  });

  // POST /favorites/workers/:workerId
  fastify.post('/favorites/workers/:workerId', { preHandler: employerAuth }, async (request, reply) => {
    const { workerId } = request.params as { workerId: string };

    await fastify.prisma.favorite.upsert({
      where: {
        userId_targetId_type: {
          userId: request.jwtUser.sub,
          targetId: workerId,
          type: 'worker',
        },
      },
      create: { userId: request.jwtUser.sub, targetId: workerId, type: 'worker' },
      update: {},
    });

    return reply.status(201).send({ data: { success: true } });
  });

  // DELETE /favorites/workers/:workerId
  fastify.delete('/favorites/workers/:workerId', { preHandler: employerAuth }, async (request, reply) => {
    const { workerId } = request.params as { workerId: string };

    await fastify.prisma.favorite.deleteMany({
      where: { userId: request.jwtUser.sub, targetId: workerId, type: 'worker' },
    });

    return reply.send({ data: { success: true } });
  });
};
