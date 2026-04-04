import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

export const catalogRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /cities
  fastify.get('/cities', async (_request, reply) => {
    const cities = await fastify.prisma.city.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return reply.send({ data: cities });
  });

  // GET /workers
  fastify.get('/workers', async (request, reply) => {
    const query = z
      .object({
        category: z.union([z.string(), z.array(z.string())]).optional(),
        cityId: z.string().optional(),
        rateMin: z.coerce.number().optional(),
        rateMax: z.coerce.number().optional(),
        experience: z.coerce.number().optional(),
        isAvailable: z.coerce.boolean().optional(),
        hasMedicalBook: z.coerce.boolean().optional(),
        willingToTravel: z.coerce.boolean().optional(),
        sortBy: z.enum(['rating', 'rate', 'experience', 'createdAt']).default('rating'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(20),
      })
      .parse(request.query);

    const categories = query.category
      ? Array.isArray(query.category)
        ? query.category
        : [query.category]
      : undefined;

    const where: Parameters<typeof fastify.prisma.workerProfile.findMany>[0]['where'] = {
      visibility: 'public',
      ...(query.cityId ? { cityId: query.cityId } : {}),
      ...(query.rateMin !== undefined || query.rateMax !== undefined
        ? {
            desiredRate: {
              ...(query.rateMin !== undefined ? { gte: query.rateMin } : {}),
              ...(query.rateMax !== undefined ? { lte: query.rateMax } : {}),
            },
          }
        : {}),
      ...(query.experience !== undefined ? { experienceYears: { gte: query.experience } } : {}),
      ...(query.hasMedicalBook !== undefined ? { hasMedicalBook: query.hasMedicalBook } : {}),
      ...(query.willingToTravel !== undefined ? { willingToTravel: query.willingToTravel } : {}),
      ...(categories?.length
        ? { categories: { some: { category: { in: categories as Parameters<typeof fastify.prisma.workerCategory.findMany>[0]['where']['category'][] } } } }
        : {}),
    };

    const orderBy: Parameters<typeof fastify.prisma.workerProfile.findMany>[0]['orderBy'] =
      query.sortBy === 'rating'
        ? { ratingScore: query.sortOrder }
        : query.sortBy === 'rate'
        ? { desiredRate: query.sortOrder }
        : query.sortBy === 'experience'
        ? { experienceYears: query.sortOrder }
        : { createdAt: query.sortOrder };

    const [total, workers] = await fastify.prisma.$transaction([
      fastify.prisma.workerProfile.count({ where }),
      fastify.prisma.workerProfile.findMany({
        where,
        include: { city: true, categories: true },
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return reply.send({
      data: workers,
      meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
    });
  });

  // GET /workers/:id
  fastify.get('/workers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const worker = await fastify.prisma.workerProfile.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        visibility: { in: ['public', 'verified_only'] },
      },
      include: {
        city: true,
        categories: true,
        workHistory: { orderBy: { dateFrom: 'desc' } },
        portfolio: true,
        user: { select: { email: true } },
      },
    });

    if (!worker) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Worker not found' } });
    }

    return reply.send({ data: worker });
  });

  // GET /vacancies
  fastify.get('/vacancies', async (request, reply) => {
    const query = z
      .object({
        category: z.union([z.string(), z.array(z.string())]).optional(),
        cityId: z.string().optional(),
        rateMin: z.coerce.number().optional(),
        rateMax: z.coerce.number().optional(),
        eventType: z.union([z.string(), z.array(z.string())]).optional(),
        employmentType: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        sortBy: z.enum(['date', 'rate', 'createdAt']).default('date'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(20),
      })
      .parse(request.query);

    const categories = query.category
      ? Array.isArray(query.category)
        ? query.category
        : [query.category]
      : undefined;
    const eventTypes = query.eventType
      ? Array.isArray(query.eventType)
        ? query.eventType
        : [query.eventType]
      : undefined;

    const where: Parameters<typeof fastify.prisma.vacancy.findMany>[0]['where'] = {
      status: 'active',
      ...(query.cityId ? { cityId: query.cityId } : {}),
      ...(categories?.length
        ? { category: { in: categories as Parameters<typeof fastify.prisma.vacancy.findMany>[0]['where']['category'][] } }
        : {}),
      ...(query.rateMin !== undefined || query.rateMax !== undefined
        ? {
            rate: {
              ...(query.rateMin !== undefined ? { gte: query.rateMin } : {}),
              ...(query.rateMax !== undefined ? { lte: query.rateMax } : {}),
            },
          }
        : {}),
      ...(eventTypes?.length
        ? { eventType: { in: eventTypes as Parameters<typeof fastify.prisma.vacancy.findMany>[0]['where']['eventType'][] } }
        : {}),
      ...(query.employmentType
        ? { employmentType: query.employmentType as Parameters<typeof fastify.prisma.vacancy.findMany>[0]['where']['employmentType'] }
        : {}),
      ...(query.dateFrom ? { dateStart: { gte: new Date(query.dateFrom) } } : {}),
      ...(query.dateTo ? { dateStart: { lte: new Date(query.dateTo) } } : {}),
    };

    const orderBy: Parameters<typeof fastify.prisma.vacancy.findMany>[0]['orderBy'] =
      query.sortBy === 'rate'
        ? { rate: query.sortOrder }
        : query.sortBy === 'date'
        ? { dateStart: query.sortOrder }
        : { createdAt: query.sortOrder };

    const [total, vacancies] = await fastify.prisma.$transaction([
      fastify.prisma.vacancy.count({ where }),
      fastify.prisma.vacancy.findMany({
        where,
        include: {
          employer: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              isVerified: true,
              logoUrl: true,
              businessType: true,
            },
          },
          city: true,
        },
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return reply.send({
      data: vacancies,
      meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
    });
  });

  // GET /vacancies/:id
  fastify.get('/vacancies/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const vacancy = await fastify.prisma.vacancy.findFirst({
      where: {
        id,
        status: { in: ['active', 'closed'] },
      },
      include: {
        employer: {
          include: { city: true },
        },
        city: true,
        _count: { select: { applications: true } },
      },
    });

    if (!vacancy) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Vacancy not found' } });
    }

    await fastify.prisma.vacancy.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    return reply.send({ data: vacancy });
  });

  // GET /employers
  fastify.get('/employers', async (request, reply) => {
    const query = z
      .object({
        businessType: z.string().optional(),
        cityId: z.string().optional(),
        isVerified: z.coerce.boolean().optional(),
        sortBy: z.enum(['rating', 'createdAt']).default('rating'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(20),
      })
      .parse(request.query);

    const where: Parameters<typeof fastify.prisma.employerProfile.findMany>[0]['where'] = {
      ...(query.businessType
        ? { businessType: query.businessType as Parameters<typeof fastify.prisma.employerProfile.findMany>[0]['where']['businessType'] }
        : {}),
      ...(query.cityId ? { cityId: query.cityId } : {}),
      ...(query.isVerified !== undefined ? { isVerified: query.isVerified } : {}),
    };

    const [total, employers] = await fastify.prisma.$transaction([
      fastify.prisma.employerProfile.count({ where }),
      fastify.prisma.employerProfile.findMany({
        where,
        include: {
          city: true,
          _count: { select: { vacancies: true } },
        },
        orderBy:
          query.sortBy === 'rating'
            ? { ratingScore: query.sortOrder }
            : { createdAt: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return reply.send({
      data: employers,
      meta: { total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) },
    });
  });

  // GET /employers/:id
  fastify.get('/employers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const employer = await fastify.prisma.employerProfile.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        city: true,
        vacancies: {
          where: { status: 'active' },
          include: { city: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!employer) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Employer not found' } });
    }

    return reply.send({ data: employer });
  });
};
