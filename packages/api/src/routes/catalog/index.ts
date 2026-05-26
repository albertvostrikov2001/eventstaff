import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Prisma, StaffCategory, EventType, EmploymentType, BusinessType } from '@prisma/client';
import { replyFail, replyOk, replyPaginated } from '../../lib/api-reply';

export const catalogRoutes: FastifyPluginAsync = async (fastify) => {
  async function getVerifiedActiveEmployerPage(idOrSlug: string) {
    const employer = await fastify.prisma.employerProfile.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        isVerified: true,
        user: { status: 'active' },
      },
      include: {
        city: true,
        vacancies: {
          where: { status: 'active' },
          include: { city: true },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!employer) return null;

    const gallery = await fastify.prisma.media.findMany({
      where: {
        userId: employer.userId,
        type: 'COMPANY_GALLERY',
        isApproved: true,
        isRejected: false,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, url: true },
    });

    const totalShifts = await fastify.prisma.shift.count({
      where: { employerId: employer.userId, status: 'COMPLETED' },
    });

    return { employer, gallery, totalShifts };
  }

  // GET /cities
  fastify.get('/cities', async (_request, reply) => {
    const cities = await fastify.prisma.city.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return replyOk(reply, cities);
  });

  // GET /workers
  fastify.get('/workers', async (request, reply) => {
    const catalogSortEnum = z.enum([
      'rating',
      'experience',
      'newest',
      'price_asc',
      'price_desc',
    ]);

    const query = z
      .object({
        category: z.union([z.string(), z.array(z.string())]).optional(),
        cityId: z.string().optional(),
        search: z.string().optional(),
        rateMin: z.coerce.number().optional(),
        rateMax: z.coerce.number().optional(),
        experience: z.coerce.number().optional(),
        minRating: z.coerce.number().min(0).max(5).optional(),
        minExperience: z.coerce.number().min(0).optional(),
        verified: z.coerce.boolean().optional(),
        isAvailable: z.coerce.boolean().optional(),
        hasMedicalBook: z.coerce.boolean().optional(),
        willingToTravel: z.coerce.boolean().optional(),
        readyForTrips: z.coerce.boolean().optional(),
        readyForOvertime: z.coerce.boolean().optional(),
        availability: z.enum(['available', 'all']).optional(),
        /** Унифицированная сортировка (Этап 4) */
        sort: catalogSortEnum.optional(),
        /** Легаси */
        sortBy: z.enum(['rating', 'rate', 'experience', 'createdAt']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        page: z.coerce.number().default(1),
        limit: z.coerce.number().min(1).max(100).default(20),
        perPage: z.coerce.number().min(1).max(100).optional(),
      })
      .parse(request.query);

    const categories = query.category
      ? Array.isArray(query.category)
        ? query.category
        : [query.category]
      : undefined;

    const limit = Math.min(100, query.perPage ?? query.limit ?? 20);
    const page = Math.max(1, query.page);

    const searchNorm = query.search?.trim();
    const minExp = query.minExperience ?? query.experience;

    const where: Prisma.WorkerProfileWhereInput = {
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
      ...(minExp !== undefined ? { experienceYears: { gte: minExp } } : {}),
      ...(query.hasMedicalBook !== undefined ? { hasMedicalBook: query.hasMedicalBook } : {}),
      ...(query.willingToTravel !== undefined ? { willingToTravel: query.willingToTravel } : {}),
      ...(query.readyForTrips === true ? { readyForTrips: true } : {}),
      ...(query.readyForOvertime === true ? { readyForOvertime: true } : {}),
      ...(query.verified === true ? { isVerified: true } : {}),
      ...(query.minRating !== undefined ? { ratingScore: { gte: query.minRating } } : {}),
      ...(categories?.length
        ? { categories: { some: { category: { in: categories as StaffCategory[] } } } }
        : {}),
      ...(searchNorm
        ? {
            OR: [
              { firstName: { contains: searchNorm, mode: 'insensitive' as const } },
              { lastName: { contains: searchNorm, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(query.availability === 'available'
        ? {
            availability: {
              some: {
                date: new Date(),
                isBlocked: false,
                isBooked: false,
              },
            },
          }
        : {}),
    };

    let orderBy: Prisma.WorkerProfileOrderByWithRelationInput[];
    const sortMerged = query.sort;
    if (sortMerged === 'experience') orderBy = [{ experienceYears: 'desc' }];
    else if (sortMerged === 'newest') orderBy = [{ createdAt: 'desc' }];
    else if (sortMerged === 'price_asc') orderBy = [{ desiredRate: 'asc' }];
    else if (sortMerged === 'price_desc') orderBy = [{ desiredRate: 'desc' }];
    else if (sortMerged === 'rating') orderBy = [{ ratingScore: 'desc' }];
    else {
      const sortBy = query.sortBy ?? 'rating';
      const sortOrder = query.sortOrder ?? 'desc';
      orderBy =
        sortBy === 'rating'
          ? [{ ratingScore: sortOrder }]
          : sortBy === 'rate'
            ? [{ desiredRate: sortOrder }]
            : sortBy === 'experience'
              ? [{ experienceYears: sortOrder }]
              : [{ createdAt: sortOrder }];
    }

    const [total, workers] = await fastify.prisma.$transaction([
      fastify.prisma.workerProfile.count({ where }),
      fastify.prisma.workerProfile.findMany({
        where,
        include: {
          city: true,
          categories: true,
          user: { select: { id: true, userReliabilityScore: { select: { level: true, score: true } } } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const workersSerialized = workers.map((w) => ({
      ...w,
      desiredRate: w.desiredRate != null ? parseFloat(w.desiredRate.toString()) : null,
    }));

    return replyPaginated(reply, workersSerialized, {
      total,
      page,
      limit,
      perPage: limit,
      totalPages: Math.ceil(total / limit),
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
      return replyFail(reply, 404, 'NOT_FOUND', 'Worker not found');
    }

    // Загружаем доступность на текущий + следующие 2 месяца
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const endDate = new Date(todayStart);
    endDate.setMonth(endDate.getMonth() + 3);

    const availability = await fastify.prisma.workerAvailability.findMany({
      where: {
        workerId: worker.id,
        date: { gte: todayStart, lte: endDate },
      },
      select: { date: true, isBlocked: true, isBooked: true },
      orderBy: { date: 'asc' },
    });

    return replyOk(reply, {
      ...worker,
      desiredRate: worker.desiredRate != null ? parseFloat(worker.desiredRate.toString()) : null,
      userId: worker.userId,
      availability: availability.map((a) => ({
        date: (a.date as Date).toISOString().split('T')[0],
        isBlocked: a.isBlocked,
        isBooked: a.isBooked,
      })),
    });
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

    const where: Prisma.VacancyWhereInput = {
      status: 'active',
      ...(query.cityId ? { cityId: query.cityId } : {}),
      ...(categories?.length
        ? { category: { in: categories as StaffCategory[] } }
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
        ? { eventType: { in: eventTypes as EventType[] } }
        : {}),
      ...(query.employmentType
        ? { employmentType: query.employmentType as EmploymentType }
        : {}),
      ...(query.dateFrom ? { dateStart: { gte: new Date(query.dateFrom) } } : {}),
      ...(query.dateTo ? { dateStart: { lte: new Date(query.dateTo) } } : {}),
    };

    const orderBy: Prisma.VacancyOrderByWithRelationInput =
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

    const vacanciesSerialized = vacancies.map((v) => ({
      ...v,
      rate: v.rate != null ? parseFloat(v.rate.toString()) : null,
    }));

    return replyPaginated(reply, vacanciesSerialized, {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
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
      return replyFail(reply, 404, 'NOT_FOUND', 'Vacancy not found');
    }

    await fastify.prisma.vacancy.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    return replyOk(reply, {
      ...vacancy,
      rate: vacancy.rate != null ? parseFloat(vacancy.rate.toString()) : null,
    });
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

    const where: Prisma.EmployerProfileWhereInput = {
      companyName: { not: null },
      NOT: { companyName: '' },
      user: { status: 'active' },
      ...(query.businessType ? { businessType: query.businessType as BusinessType } : {}),
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

    // Serialize Prisma Decimal fields to plain numbers (Fastify fast-json-stringify
    // does not call toJSON() on Decimal, so they arrive in the browser as raw objects)
    const serialized = employers.map((e) => ({
      ...e,
      ratingScore: e.ratingScore != null ? parseFloat(e.ratingScore.toString()) : null,
      reliabilityScore: parseFloat(e.reliabilityScore.toString()),
      responseRate: parseFloat(e.responseRate.toString()),
      commissionRate: parseFloat(e.commissionRate.toString()),
    }));

    return replyPaginated(reply, serialized, {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    });
  });

  // GET /employers/:id
  fastify.get('/employers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const pack = await getVerifiedActiveEmployerPage(id);

    if (!pack) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Employer not found');
    }

    const { employer, gallery, totalShifts } = pack;
    // Serialize Prisma Decimal fields to plain numbers
    const serialized = {
      ...employer,
      ratingScore: employer.ratingScore != null ? parseFloat(employer.ratingScore.toString()) : null,
      reliabilityScore: parseFloat(employer.reliabilityScore.toString()),
      responseRate: parseFloat(employer.responseRate.toString()),
      commissionRate: parseFloat(employer.commissionRate.toString()),
      vacancies: employer.vacancies.map((v) => ({
        ...v,
        rate: parseFloat(v.rate.toString()),
      })),
      gallery,
      totalShifts,
    };
    return replyOk(reply, serialized);
  });

  // GET /employers/:id/profile — плоский объект для интеграций (те же ограничения видимости)
  fastify.get('/employers/:id/profile', async (request, reply) => {
    const { id } = request.params as { id: string };
    const pack = await getVerifiedActiveEmployerPage(id);

    if (!pack) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Employer not found');
    }

    const { employer, gallery, totalShifts } = pack;

    return replyOk(reply, {
      companyName: employer.companyName,
      city: employer.city,
      sphere: employer.businessType,
      bio: employer.description,
      logo: employer.logoUrl,
      banner: employer.bannerUrl,
      gallery,
      verified: employer.isVerified,
      rating: employer.ratingScore !== null ? String(employer.ratingScore) : null,
      totalShifts,
      vacancies: employer.vacancies,
    });
  });
};
