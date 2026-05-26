import { ApplicationStatus, BookingStatus, BusinessType, type Vacancy, Prisma, ShiftStatus, ShiftPayStatus, ShiftFailedBy } from '@prisma/client';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import {
  employerProfileUpdateSchema,
  employerVacancyPutBodySchema,
  vacancyCreateSchema,
  employerVacancyListQuerySchema,
  type VacancyCreateInput,
  type VacancyMutationPartialInput,
} from '@unity/shared';
import { z } from 'zod';
import { replyFail, replyOk, replyPaginated } from '@/lib/api-reply';
import { getUserRestriction, restrictedReply } from '@/lib/restriction';
import { publicSiteUrl } from '@/lib/public-site-url';
import {
  ShiftConfirmationError,
  confirmShiftParticipation,
} from '@/lib/shift-confirmation';
import { WORKER_FAILURE_CODES } from '@/lib/shift-codes';
import { ReliabilityService } from '@/services/reliability-service';
import { SubscriptionService } from '@/services/subscription-service';

function vacancyTagsAsStrings(tags: unknown): string[] | undefined {
  if (!Array.isArray(tags)) return undefined;
  return tags.filter((t): t is string => typeof t === 'string');
}

/** Сложение сохранённой вакансии и PATCH для проверки публикации (status=active) */
function vacancyMergedActivationPayload(v: Vacancy, patch: VacancyMutationPartialInput): VacancyCreateInput {
  const dateEndMerged =
    patch.dateEnd !== undefined
      ? !patch.dateEnd || patch.dateEnd === ''
        ? undefined
        : patch.dateEnd
      : v.dateEnd
        ? v.dateEnd.toISOString()
        : undefined;

  return {
    title: patch.title ?? v.title,
    category: patch.category ?? (v.category as VacancyCreateInput['category']),
    specialization: patch.specialization ?? v.specialization ?? undefined,
    eventType: patch.eventType ?? (v.eventType as VacancyCreateInput['eventType']) ?? undefined,
    venueLevel: patch.venueLevel ?? v.venueLevel ?? undefined,
    rate: patch.rate ?? Number(v.rate),
    rateType: patch.rateType ?? (v.rateType as VacancyCreateInput['rateType']),
    employmentType:
      patch.employmentType ?? (v.employmentType as VacancyCreateInput['employmentType']),
    dateStart: patch.dateStart ? patch.dateStart : v.dateStart.toISOString(),
    dateEnd: dateEndMerged,
    timeStart: patch.timeStart ?? v.timeStart ?? undefined,
    timeEnd: patch.timeEnd ?? v.timeEnd ?? undefined,
    address: patch.address ?? v.address ?? undefined,
    workersNeeded: patch.workersNeeded ?? v.workersNeeded,
    dressCode: patch.dressCode ?? v.dressCode ?? undefined,
    experienceRequired: patch.experienceRequired ?? v.experienceRequired ?? undefined,
    responsibilities: patch.responsibilities ?? v.responsibilities ?? undefined,
    requirements: patch.requirements ?? v.requirements ?? undefined,
    conditions: patch.conditions ?? v.conditions ?? undefined,
    description: patch.description ?? v.description ?? undefined,
    foodProvided: patch.foodProvided ?? v.foodProvided,
    transportProvided: patch.transportProvided ?? v.transportProvided,
    tipsPossible: patch.tipsPossible ?? v.tipsPossible ?? undefined,
    isUrgent: patch.isUrgent ?? v.isUrgent,
    cityId:
      patch.cityId !== undefined
        ? patch.cityId === null
          ? undefined
          : patch.cityId
        : v.cityId ?? undefined,
    coverImageUrl:
      patch.coverImageUrl !== undefined
        ? patch.coverImageUrl === '' || !patch.coverImageUrl.trim()
          ? ''
          : patch.coverImageUrl
        : (v.coverImageUrl ?? ''),
    tags: patch.tags ?? vacancyTagsAsStrings(v.tags),
    status: 'active',
  };
}

export const employerRoutes: FastifyPluginAsync = async (fastify) => {
  const employerAuth = [
    fastify.authenticate,
    fastify.requireRole(['employer']),
  ];
  const subSvc = new SubscriptionService(fastify.prisma);

  // GET /dashboard/summary — ожидающие отклики (pending) и всего откликов по вакансиям работодателя
  fastify.get('/dashboard/summary', { preHandler: employerAuth }, async (request, reply) => {
    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const vacancyRows = await fastify.prisma.vacancy.findMany({
      where: { employerId: profile.id },
      select: { id: true },
    });
    const vacancyIds = vacancyRows.map((v) => v.id);

    if (vacancyIds.length === 0) {
      return replyOk(reply, { pendingApplicationsCount: 0, totalApplicationsCount: 0 });
    }

    const baseWhere: Prisma.ApplicationWhereInput = { vacancyId: { in: vacancyIds } };

    const [pendingApplicationsCount, totalApplicationsCount] = await fastify.prisma.$transaction([
      fastify.prisma.application.count({
        where: { ...baseWhere, status: ApplicationStatus.pending },
      }),
      fastify.prisma.application.count({ where: baseWhere }),
    ]);

    return replyOk(reply, { pendingApplicationsCount, totalApplicationsCount });
  });

  // GET /profile
  fastify.get('/profile', { preHandler: employerAuth }, async (request, reply) => {
    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      include: {
        city: true,
        user: {
          select: { id: true, email: true, phone: true, emailVerified: true },
        },
      },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }
    return replyOk(reply, profile);
  });

  // PUT /profile
  fastify.put('/profile', { preHandler: employerAuth }, async (request, reply) => {
    const body = employerProfileUpdateSchema.parse(request.body);
    const uid = request.jwtUser.sub;

    const userRow = await fastify.prisma.user.findUnique({
      where: { id: uid },
      select: { email: true, emailVerified: true },
    });
    if (!userRow) {
      return replyFail(reply, 404, 'NOT_FOUND', 'User not found');
    }

    const norm = (s: string) => s.trim().toLowerCase();
    if (userRow.emailVerified) {
      if (norm(body.email) !== norm(userRow.email ?? '')) {
        return replyFail(reply, 403, 'FORBIDDEN', 'Email уже подтверждён и не может быть изменён');
      }
    }

    const innDigits = (body.inn ?? '').trim();
    const contactNameMerged = `${body.contactFirstName.trim()} ${body.contactLastName.trim()}`.trim();
    const jobTitleTrim = body.contactJobTitle?.trim();

    await fastify.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: uid },
        data: {
          phone: body.phone.trim(),
          ...(!userRow.emailVerified ? { email: norm(body.email) } : {}),
        },
      });

      await tx.employerProfile.update({
        where: { userId: uid },
        data: {
          ...(body.type !== undefined && { type: body.type }),
          companyName: body.companyName.trim(),
          ...(innDigits ? { inn: innDigits } : { inn: null }),
          contactFirstName: body.contactFirstName.trim(),
          contactLastName: body.contactLastName.trim(),
          ...(jobTitleTrim ? { contactJobTitle: jobTitleTrim } : { contactJobTitle: null }),
          contactName: contactNameMerged,
          description:
            (body.description ?? '').trim() === '' ? null : (body.description as string).trim(),
          businessType: body.businessType as BusinessType,
          website: body.website.trim() === '' ? null : body.website.trim(),
          cityId: body.cityId,
        },
      });
    });

    const updated = await fastify.prisma.employerProfile.findUnique({
      where: { userId: uid },
      include: {
        city: true,
        user: {
          select: { id: true, email: true, phone: true, emailVerified: true },
        },
      },
    });

    return replyOk(reply, updated);
  });

  // GET /applications/recent — последние отклики по всем вакансиям работодателя
  fastify.get('/applications/recent', { preHandler: employerAuth }, async (request, reply) => {
    const q = z
      .object({ limit: z.coerce.number().int().min(1).max(25).default(5) })
      .parse(request.query);

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const vacancyRows = await fastify.prisma.vacancy.findMany({
      where: { employerId: profile.id },
      select: { id: true },
    });
    const vacancyIds = vacancyRows.map((v) => v.id);
    if (vacancyIds.length === 0) {
      return replyPaginated(reply, [], { total: 0 });
    }

    const whereApp: Prisma.ApplicationWhereInput = { vacancyId: { in: vacancyIds } };

    const [total, applications] = await fastify.prisma.$transaction([
      fastify.prisma.application.count({ where: whereApp }),
      fastify.prisma.application.findMany({
        where: whereApp,
        orderBy: { createdAt: 'desc' },
        take: q.limit,
        include: {
          worker: {
            select: {
              id: true,
              userId: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
              ratingScore: true,
            },
          },
          vacancy: { select: { id: true, title: true, city: { select: { name: true } } } },
        },
      }),
    ]);

    return replyPaginated(reply, applications, { total });
  });

  // GET /applications — все отклики с фильтрами и пагинацией
  fastify.get('/applications', { preHandler: employerAuth }, async (request, reply) => {
    const q = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        perPage: z.coerce.number().int().min(1).max(50).default(20),
        status: z.nativeEnum(ApplicationStatus).optional(),
        vacancyId: z.string().optional(),
        search: z.string().optional(),
        sort: z.enum(['newest', 'oldest', 'rating']).default('newest'),
      })
      .parse(request.query);

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const vacancyRows = await fastify.prisma.vacancy.findMany({
      where: { employerId: profile.id },
      select: { id: true },
    });
    const vacancyIds = vacancyRows.map((v) => v.id);
    if (vacancyIds.length === 0) {
      return replyPaginated(reply, [], {
        total: 0,
        page: q.page,
        perPage: q.perPage,
        totalPages: 0,
      });
    }

    const vacancyScope =
      q.vacancyId != null && q.vacancyId !== ''
        ? vacancyIds.includes(q.vacancyId)
          ? [q.vacancyId]
          : ['__no_match__']
        : vacancyIds;

    const searchNorm = q.search?.trim();

    const whereApp: Prisma.ApplicationWhereInput = {
      vacancyId: { in: vacancyScope },
      ...(q.status ? { status: q.status } : {}),
      ...(searchNorm
        ? {
            worker: {
              OR: [
                { firstName: { contains: searchNorm, mode: 'insensitive' } },
                { lastName: { contains: searchNorm, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    let orderBy: Prisma.ApplicationOrderByWithRelationInput[] = [{ createdAt: 'desc' }];
    if (q.sort === 'oldest') {
      orderBy = [{ createdAt: 'asc' }];
    } else if (q.sort === 'rating') {
      orderBy = [{ worker: { ratingScore: 'desc' } }, { createdAt: 'desc' }];
    }

    const [total, applications] = await fastify.prisma.$transaction([
      fastify.prisma.application.count({ where: whereApp }),
      fastify.prisma.application.findMany({
        where: whereApp,
        orderBy,
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
        include: {
          worker: {
            select: {
              id: true,
              userId: true,
              firstName: true,
              lastName: true,
              photoUrl: true,
              ratingScore: true,
            },
          },
          vacancy: { select: { id: true, title: true, city: { select: { name: true } } } },
        },
      }),
    ]);

    return replyPaginated(reply, applications, {
      total,
      page: q.page,
      perPage: q.perPage,
      totalPages: Math.ceil(total / q.perPage),
    });
  });

  // GET /individual-requests — персональные заявки, созданные текущим пользователем (кабинет)
  fastify.get('/individual-requests', { preHandler: employerAuth }, async (request, reply) => {
    const q = z
      .object({ page: z.coerce.number().int().positive().default(1) })
      .parse(request.query);
    const limit = 20;
    const where: Prisma.IndividualRequestWhereInput = {
      role: 'employer',
      createdByUserId: request.jwtUser.sub,
    };
    const [total, rows] = await fastify.prisma.$transaction([
      fastify.prisma.individualRequest.count({ where }),
      fastify.prisma.individualRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * limit,
        take: limit,
        select: {
          id: true,
          status: true,
          quantity: true,
          staffNeeded: true,
          createdAt: true,
        },
      }),
    ]);
    return replyPaginated(reply, rows, {
      total,
      page: q.page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  });

  // GET /vacancies — списки работодателя: табы «живые / архив», поиск, сортировка
  fastify.get('/vacancies', { preHandler: employerAuth }, async (request, reply) => {
    const query = employerVacancyListQuerySchema.parse(request.query);

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const searchNorm = query.search?.trim();

    const where: Prisma.VacancyWhereInput = {
      employerId: profile.id,
      ...(query.tab === 'archived'
        ? { status: 'archived' as const }
        : {
            ...(query.vacancyStatus && query.vacancyStatus !== 'all'
              ? { status: query.vacancyStatus as Prisma.VacancyWhereInput['status'] }
              : { status: { in: ['active', 'paused', 'draft'] } }),
          }),
      ...(searchNorm
        ? { title: { contains: searchNorm, mode: 'insensitive' as const } }
        : {}),
    };

    const orderBy: Prisma.VacancyOrderByWithRelationInput =
      query.sort === 'oldest'
        ? { createdAt: 'asc' }
        : query.sort === 'startAt'
          ? { dateStart: 'asc' }
          : { createdAt: 'desc' };

    const [total, vacancies] = await fastify.prisma.$transaction([
      fastify.prisma.vacancy.count({ where }),
      fastify.prisma.vacancy.findMany({
        where,
        include: {
          city: true,
          _count: { select: { applications: true } },
        },
        orderBy,
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
    ]);

    return replyPaginated(reply, vacancies, {
      total,
      page: query.page,
      limit: query.perPage,
      totalPages: Math.ceil(total / query.perPage),
    });
  });

  // POST /vacancies
  fastify.post('/vacancies', { preHandler: employerAuth }, async (request, reply) => {
    const body = vacancyCreateSchema.parse(request.body);

    const rest = await getUserRestriction(fastify.prisma, request.jwtUser.sub);
    if (rest.restricted) {
      const r = restrictedReply();
      return replyFail(
        reply,
        r.status,
        String((r.body.error as { code?: string }).code ?? 'ACCOUNT_RESTRICTED'),
        String((r.body.error as { message?: string }).message ?? ''),
      );
    }

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    // ── Vacancy limit check (only for active/paused, not drafts) ──
    if (body.status === 'active' || body.status === 'paused') {
      const canCreate = await subSvc.canEmployerCreateVacancy(profile.id);
      if (!canCreate.allowed) {
        return replyFail(
          reply,
          403,
          'VACANCY_LIMIT_REACHED',
          `Вы достигли лимита активных вакансий (${canCreate.limit}) на тарифе «${canCreate.plan === 'free' ? 'Старт' : canCreate.plan}». Перейдите на тариф Бизнес или Про.`,
          { current: canCreate.current, limit: canCreate.limit, plan: canCreate.plan },
        );
      }
    }

    const prismaStatus =
      body.status === 'active' ? 'active' : body.status === 'paused' ? 'paused' : 'draft';

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
        employmentType:
          body.employmentType as Parameters<typeof fastify.prisma.vacancy.create>[0]['data']['employmentType'],
        dateStart: new Date(body.dateStart),
        dateEnd: body.dateEnd && body.dateEnd !== '' ? new Date(body.dateEnd) : undefined,
        timeStart: body.timeStart,
        timeEnd: body.timeEnd,
        address: body.address,
        workersNeeded: body.workersNeeded,
        dressCode: body.dressCode,
        experienceRequired: body.experienceRequired,
        responsibilities: body.responsibilities,
        requirements: body.requirements,
        conditions: body.conditions,
        description: body.description || undefined,
        foodProvided: body.foodProvided,
        transportProvided: body.transportProvided,
        tipsPossible: body.tipsPossible,
        isUrgent: body.isUrgent,
        cityId: body.cityId || undefined,
        coverImageUrl: body.coverImageUrl && body.coverImageUrl.trim() !== '' ? body.coverImageUrl.trim() : null,
        tags: body.tags?.length ? (body.tags as Prisma.InputJsonValue) : undefined,
        status: prismaStatus,
        ...(prismaStatus === 'active' ? { publishedAt: new Date() } : {}),
      },
      include: { city: true, _count: { select: { applications: true } } },
    });

    return replyOk(reply, vacancy, 201);
  });

  // GET /vacancies/:id
  fastify.get('/vacancies/:id', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const vacancy = await fastify.prisma.vacancy.findFirst({
      where: { id, employerId: profile.id },
      include: { city: true, _count: { select: { applications: true } } },
    });

    if (!vacancy) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Vacancy not found');
    }

    return replyOk(reply, vacancy);
  });

  // PUT /vacancies/:id
  fastify.put('/vacancies/:id', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status: statusFromBody, ...patch } = employerVacancyPutBodySchema.parse(request.body);

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const vacancy = await fastify.prisma.vacancy.findFirst({
      where: { id, employerId: profile.id },
    });
    if (!vacancy) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Vacancy not found');
    }

    if (vacancy.status === 'archived') {
      return replyFail(
        reply,
        400,
        'ARCHIVED',
        'Архивную вакансию нужно вернуть из архива перед редактированием или используйте копирование.',
      );
    }

    const resultingStatus = statusFromBody ?? vacancy.status;

    const willBeActive = resultingStatus === 'active';

    if (willBeActive) {
      const candidate = vacancyMergedActivationPayload(vacancy, patch);
      const chk = vacancyCreateSchema.safeParse({ ...candidate, status: 'active' });
      if (!chk.success) {
        return replyFail(
          reply,
          422,
          'VALIDATION',
          chk.error.flatten().fieldErrors.dateStart?.[0] ?? 'Не выполнены условия публикации',
          chk.error.flatten(),
        );
      }
    }

    const updated = await fastify.prisma.vacancy.update({
      where: { id },
      data: {
        ...(patch.title !== undefined && { title: patch.title }),
        ...(patch.category !== undefined && {
          category: patch.category as Parameters<typeof fastify.prisma.vacancy.update>[0]['data']['category'],
        }),
        ...(patch.description !== undefined && { description: patch.description }),
        ...(patch.rate !== undefined && { rate: patch.rate }),
        ...(patch.rateType !== undefined && {
          rateType: patch.rateType as Parameters<typeof fastify.prisma.vacancy.update>[0]['data']['rateType'],
        }),
        ...(patch.employmentType !== undefined && {
          employmentType:
            patch.employmentType as Parameters<typeof fastify.prisma.vacancy.update>[0]['data']['employmentType'],
        }),
        ...(patch.eventType !== undefined && {
          eventType: patch.eventType as Parameters<typeof fastify.prisma.vacancy.update>[0]['data']['eventType'],
        }),
        ...(patch.dateStart !== undefined && { dateStart: new Date(patch.dateStart) }),
        ...(patch.dateEnd !== undefined && {
          dateEnd: patch.dateEnd && patch.dateEnd !== '' ? new Date(patch.dateEnd) : null,
        }),
        ...(patch.specialization !== undefined && { specialization: patch.specialization }),
        ...(patch.venueLevel !== undefined && { venueLevel: patch.venueLevel }),
        ...(patch.timeStart !== undefined && { timeStart: patch.timeStart }),
        ...(patch.timeEnd !== undefined && { timeEnd: patch.timeEnd }),
        ...(patch.address !== undefined && { address: patch.address }),
        ...(patch.workersNeeded !== undefined && { workersNeeded: patch.workersNeeded }),
        ...(patch.dressCode !== undefined && { dressCode: patch.dressCode }),
        ...(patch.experienceRequired !== undefined && { experienceRequired: patch.experienceRequired }),
        ...(patch.responsibilities !== undefined && { responsibilities: patch.responsibilities }),
        ...(patch.requirements !== undefined && { requirements: patch.requirements }),
        ...(patch.conditions !== undefined && { conditions: patch.conditions }),
        ...(patch.foodProvided !== undefined && { foodProvided: patch.foodProvided }),
        ...(patch.transportProvided !== undefined && { transportProvided: patch.transportProvided }),
        ...(patch.tipsPossible !== undefined && { tipsPossible: patch.tipsPossible }),
        ...(patch.isUrgent !== undefined && { isUrgent: patch.isUrgent }),
        ...(patch.cityId !== undefined && { cityId: patch.cityId || undefined }),
        ...(patch.coverImageUrl !== undefined && {
          coverImageUrl: patch.coverImageUrl.trim() !== '' ? patch.coverImageUrl.trim() : null,
        }),
        ...(patch.tags !== undefined && {
          tags: patch.tags && patch.tags.length ? (patch.tags as Prisma.InputJsonValue) : undefined,
        }),
        ...(statusFromBody !== undefined && {
          status: statusFromBody as Parameters<typeof fastify.prisma.vacancy.update>[0]['data']['status'],
          ...(statusFromBody === 'active' && vacancy.status !== 'active' ? { publishedAt: new Date() } : {}),
        }),
      },
      include: { city: true, _count: { select: { applications: true } } },
    });

    return replyOk(reply, updated);
  });

  // PATCH /vacancies/:id/archive
  fastify.patch('/vacancies/:id/archive', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const vacancy = await fastify.prisma.vacancy.findFirst({
      where: { id, employerId: profile.id },
    });
    if (!vacancy) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Vacancy not found');
    }

    if (vacancy.status === 'archived') {
      return replyOk(reply, vacancy);
    }

    const mayArchive =
      vacancy.status === 'active' ||
      vacancy.status === 'paused' ||
      vacancy.status === 'draft' ||
      vacancy.status === 'closed' ||
      vacancy.status === 'pending_moderation';

    if (!mayArchive) {
      return replyFail(reply, 400, 'INVALID_TRANSITION', 'Нельзя отправить текущую вакансию в архив');
    }

    const updated = await fastify.prisma.vacancy.update({
      where: { id },
      data: { status: 'archived' },
    });

    return replyOk(reply, updated);
  });

  // PATCH /vacancies/:id/unarchive
  fastify.patch('/vacancies/:id/unarchive', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const vacancy = await fastify.prisma.vacancy.findFirst({
      where: { id, employerId: profile.id },
    });
    if (!vacancy) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Vacancy not found');
    }

    if (vacancy.status !== 'archived') {
      return replyFail(
        reply,
        400,
        'INVALID_STATUS',
        'Из архива можно восстановить только архивированную вакансию',
      );
    }

    const startMs = vacancy.dateStart.getTime();
    if (startMs <= Date.now()) {
      return replyFail(
        reply,
        409,
        'START_AT_PAST',
        'Дата начала вакансии в прошлом. Отредактируйте и перенесите дату перед публикацией.',
      );
    }

    const updated = await fastify.prisma.vacancy.update({
      where: { id },
      data: {
        status: 'active',
        ...(vacancy.publishedAt == null ? { publishedAt: new Date() } : {}),
      },
    });

    return replyOk(reply, updated);
  });

  // PATCH /vacancies/:id/pause — только из active
  fastify.patch('/vacancies/:id/pause', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const vacancy = await fastify.prisma.vacancy.findFirst({ where: { id, employerId: profile.id } });
    if (!vacancy) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Vacancy not found');
    }
    if (vacancy.status !== 'active') {
      return replyFail(reply, 400, 'INVALID_TRANSITION', 'Пауза доступна только для активной вакансии');
    }

    const updated = await fastify.prisma.vacancy.update({
      where: { id },
      data: { status: 'paused' },
    });

    return replyOk(reply, updated);
  });

  // PATCH /vacancies/:id/resume — из paused обратно в active (с теми же проверками, что PUT → active)
  fastify.patch('/vacancies/:id/resume', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const vacancy = await fastify.prisma.vacancy.findFirst({ where: { id, employerId: profile.id } });
    if (!vacancy) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Vacancy not found');
    }

    if (vacancy.status !== 'paused') {
      return replyFail(reply, 400, 'INVALID_TRANSITION', 'Возможно только для вакансии на паузе');
    }

    const candidate = vacancyMergedActivationPayload(vacancy, {});
    const chk = vacancyCreateSchema.safeParse({ ...candidate, status: 'active' });
    if (!chk.success) {
      return replyFail(
        reply,
        422,
        'VALIDATION',
        chk.error.flatten().fieldErrors.dateStart?.[0] ?? 'Не выполнены условия активации',
        chk.error.flatten(),
      );
    }

    const updated = await fastify.prisma.vacancy.update({
      where: { id },
      data: {
        status: 'active',
        ...(vacancy.publishedAt == null ? { publishedAt: new Date() } : {}),
      },
      include: { city: true, _count: { select: { applications: true } } },
    });

    return replyOk(reply, updated);
  });

  // POST /vacancies/duplicate — копия (черновик)
  fastify.post('/vacancies/duplicate', { preHandler: employerAuth }, async (request, reply) => {
    const { sourceId } = z.object({ sourceId: z.string() }).parse(request.body);

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const src = await fastify.prisma.vacancy.findFirst({
      where: { id: sourceId, employerId: profile.id },
    });

    if (!src) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Vacancy not found');
    }

    const title = `${src.title} (копия)`.slice(0, 100);

    const duplicate = await fastify.prisma.vacancy.create({
      data: {
        employerId: profile.id,
        title,
        category: src.category,
        specialization: src.specialization,
        eventType: src.eventType,
        venueLevel: src.venueLevel,
        rate: src.rate,
        rateType: src.rateType,
        employmentType: src.employmentType,
        dateStart: src.dateStart,
        dateEnd: src.dateEnd,
        timeStart: src.timeStart,
        timeEnd: src.timeEnd,
        address: src.address,
        lat: src.lat,
        lng: src.lng,
        workersNeeded: src.workersNeeded,
        workersConfirmed: 0,
        dressCode: src.dressCode,
        experienceRequired: src.experienceRequired,
        responsibilities: src.responsibilities,
        requirements: src.requirements,
        conditions: src.conditions,
        description: src.description,
        foodProvided: src.foodProvided,
        transportProvided: src.transportProvided,
        tipsPossible: src.tipsPossible,
        isUrgent: src.isUrgent,
        cityId: src.cityId,
        coverImageUrl: src.coverImageUrl,
        tags: src.tags ? (src.tags as Prisma.InputJsonValue) : undefined,
        status: 'draft',
        publishedAt: null,
        expiresAt: null,
        moderatedBy: null,
        moderationNote: null,
        viewsCount: 0,
      },
      include: { city: true, _count: { select: { applications: true } } },
    });

    return replyOk(reply, duplicate, 201);
  });

  // GET /vacancies/:id/applications
  fastify.get('/vacancies/:id/applications', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const vacancy = await fastify.prisma.vacancy.findFirst({
      where: { id, employerId: profile.id },
    });
    if (!vacancy) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Vacancy not found');
    }

    const applications = await fastify.prisma.application.findMany({
      where: { vacancyId: id },
        include: {
          worker: {
            include: {
              city: true,
              categories: true,
              user: { select: { id: true, email: true } },
            },
          },
        },
      orderBy: { createdAt: 'desc' },
    });

    return replyOk(reply, applications);
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
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const application = await fastify.prisma.application.findFirst({
      where: { id },
      include: {
        vacancy: {
          include: { employer: { select: { userId: true } } },
        },
      },
    });
    if (!application || application.vacancy.employerId !== profile.id) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Application not found');
    }

    const updated = await fastify.prisma.application.update({
      where: { id },
      data: { status: body.status as Parameters<typeof fastify.prisma.application.update>[0]['data']['status'] },
    });

    // When employer confirms application → auto-create Booking + Shift
    if (body.status === 'confirmed') {
      const v = application.vacancy;
      const existingBooking = await fastify.prisma.booking.findFirst({
        where: { linkedVacancyId: v.id, workerId: application.workerId },
      });
      if (!existingBooking) {
        const booking = await fastify.prisma.booking.create({
          data: {
            employerId: profile.id,
            workerId: application.workerId,
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
        // Create shift
        const workerUser = await fastify.prisma.workerProfile.findUnique({
          where: { id: application.workerId },
          select: { userId: true },
        });
        if (workerUser) {
          await fastify.prisma.shift.create({
            data: {
              bookingId: booking.id,
              workerId: workerUser.userId,
              employerId: request.jwtUser.sub,
              status: ShiftStatus.PENDING,
            },
          });
        }
      }
    }

    const worker = await fastify.prisma.workerProfile.findUnique({
      where: { id: application.workerId },
      include: { user: { select: { id: true, email: true } } },
    });
    const site = publicSiteUrl();
    const employerName =
      profile.companyName || profile.contactName || 'Работодатель';

    if (worker?.user) {
      if (body.status === 'cancelled') {
        await fastify.notificationService.create({
          userId: worker.user.id,
          type: 'CANCELLATION',
          title: 'Отклик отменён',
          body: `Работодатель отменил сотрудничество по «${application.vacancy.title}»`,
          data: { applicationId: id, vacancyId: application.vacancyId },
        });
        if (worker.user.email) {
          await fastify.emailService.queue({
            userId: worker.user.id,
            to: worker.user.email,
            type: 'CANCELLATION',
            templateData: {
              vacancyTitle: application.vacancy.title,
              cancelledByRole: 'Работодатель',
              cancellationReason: 'Статус отклика изменён на «отменён»',
              ctaUrl: `${site}/worker/applications`,
            },
          });
        }
      } else if (body.status === 'confirmed' || body.status === 'rejected') {
        const statusLabel = body.status === 'confirmed' ? 'принят' : 'отклонён';
        const notifTitle = body.status === 'confirmed' ? 'Смена назначена' : 'Ответ по отклику';
        const notifBody = body.status === 'confirmed'
          ? `Работодатель «${employerName}» назначил вам смену по вакансии «${application.vacancy.title}». Перейдите в «Мои смены» чтобы принять.`
          : `Ваш отклик на «${application.vacancy.title}» ${statusLabel}`;
        await fastify.notificationService.create({
          userId: worker.user.id,
          type: 'APPLICATION_RESPONSE',
          title: notifTitle,
          body: notifBody,
          data: { applicationId: id, vacancyId: application.vacancyId, status: body.status },
        });
        if (worker.user.email) {
          await fastify.emailService.queue({
            userId: worker.user.id,
            to: worker.user.email,
            type: 'APPLICATION_RESPONSE',
            templateData: {
              vacancyTitle: application.vacancy.title,
              employerName,
              status: statusLabel,
              ctaUrl: `${site}/worker/applications`,
            },
          });
        }
      }
    }

    return replyOk(reply, updated);
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
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const vacancy = await fastify.prisma.vacancy.findFirst({
      where: { id: body.vacancyId, employerId: profile.id },
      include: { city: true },
    });
    if (!vacancy) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Vacancy not found');
    }

    const existing = await fastify.prisma.application.findUnique({
      where: {
        vacancyId_workerId: { vacancyId: body.vacancyId, workerId: body.workerId },
      },
    });
    if (existing) {
      return replyFail(reply, 409, 'DUPLICATE', 'Приглашение уже отправлено');
    }

    const application = await fastify.prisma.application.create({
      data: {
        vacancyId: body.vacancyId,
        workerId: body.workerId,
        status: 'invited',
      },
    });

    const worker = await fastify.prisma.workerProfile.findUnique({
      where: { id: body.workerId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (worker?.user) {
      const site = publicSiteUrl();
      const employerName =
        profile.companyName || profile.contactName || 'Работодатель';
      const eventDate = vacancy.dateStart.toLocaleDateString('ru-RU', {
        dateStyle: 'long',
      });
      const eventLocation =
        [vacancy.address, vacancy.city?.name].filter(Boolean).join(', ') || 'Уточняется';

      await fastify.notificationService.create({
        userId: worker.user.id,
        type: 'INVITATION',
        title: 'Вас пригласили',
        body: `${employerName} приглашает вас на «${vacancy.title}»`,
        data: { applicationId: application.id, vacancyId: vacancy.id },
      });

      if (worker.user.email) {
        await fastify.emailService.queue({
          userId: worker.user.id,
          to: worker.user.email,
          type: 'INVITATION',
          templateData: {
            vacancyTitle: vacancy.title,
            employerName,
            eventDate,
            eventLocation,
            ctaUrl: `${site}/worker/applications`,
          },
        });
      }
    }

    return replyOk(reply, application, 201);
  });

  // GET /favorites/target-ids — лёгкий список id для синхронизации избранного на фронте
  fastify.get('/favorites/target-ids', { preHandler: employerAuth }, async (request, reply) => {
    const rows = await fastify.prisma.favorite.findMany({
      where: { userId: request.jwtUser.sub, type: 'worker' },
      select: { targetId: true },
      orderBy: { createdAt: 'desc' },
    });
    return replyPaginated(reply, rows.map((r) => r.targetId), { total: rows.length });
  });

  // GET /favorites + GET /favorites/workers — избранные работники с пагинацией
  async function loadFavoriteWorkersPage(jwtSub: string, page: number, perPage: number) {
    const whereFv = { userId: jwtSub, type: 'worker' as const };
    const [total, favorites] = await fastify.prisma.$transaction([
      fastify.prisma.favorite.count({ where: whereFv }),
      fastify.prisma.favorite.findMany({
        where: whereFv,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        select: { targetId: true },
      }),
    ]);
    const workerIds = favorites.map((f) => f.targetId);
    const workers = workerIds.length
      ? await fastify.prisma.workerProfile.findMany({
          where: { id: { in: workerIds } },
          include: { city: true, categories: true },
        })
      : [];
    const order = new Map(workerIds.map((id, i) => [id, i]));
    workers.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return { workers, total, page, perPage };
  }

  const favoriteWorkersListHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const q = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        perPage: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(request.query);
    const { workers, total, page, perPage } = await loadFavoriteWorkersPage(
      request.jwtUser.sub,
      q.page,
      q.perPage,
    );
    return replyPaginated(reply, workers, {
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  };

  fastify.get('/favorites', { preHandler: employerAuth }, favoriteWorkersListHandler);
  fastify.get('/favorites/workers', { preHandler: employerAuth }, favoriteWorkersListHandler);

  // POST /favorites { workerId }
  fastify.post('/favorites', { preHandler: employerAuth }, async (request, reply) => {
    const { workerId } = z.object({ workerId: z.string() }).parse(request.body);

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

    return replyOk(reply, { success: true }, 201);
  });

  // DELETE /favorites/:workerId
  fastify.delete('/favorites/:workerId', { preHandler: employerAuth }, async (request, reply) => {
    const { workerId } = request.params as { workerId: string };

    await fastify.prisma.favorite.deleteMany({
      where: { userId: request.jwtUser.sub, targetId: workerId, type: 'worker' },
    });

    return replyOk(reply, { success: true });
  });

  // POST /favorites/workers/:workerId (legacy alias)
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

    return replyOk(reply, { success: true }, 201);
  });

  // DELETE /favorites/workers/:workerId (legacy alias)
  fastify.delete('/favorites/workers/:workerId', { preHandler: employerAuth }, async (request, reply) => {
    const { workerId } = request.params as { workerId: string };

    await fastify.prisma.favorite.deleteMany({
      where: { userId: request.jwtUser.sub, targetId: workerId, type: 'worker' },
    });

    return replyOk(reply, { success: true });
  });

  // GET /shifts — вкладки, фильтры, счётчики по табам
  fastify.get('/shifts', { preHandler: employerAuth }, async (request, reply) => {
    const employerShiftTabs = [
      'active',
      'pending_confirm',
      'completed',
      'needs_payment',
      'archive',
      'disputed',
      'all',
    ] as const;

    type EmployerShiftTab = (typeof employerShiftTabs)[number];

    const q = z
      .object({
        tab: z.enum(employerShiftTabs).optional(),
        view: z.enum(['active', 'completed', 'needs_payment']).optional(),
        /** Старый фронт: ?status= вместо tab/view */
        status: z.enum(['active', 'completed', 'needs_payment']).optional(),
        page: z.coerce.number().int().positive().default(1),
        perPage: z.coerce.number().int().min(1).max(50).default(20),
        vacancyId: z.string().optional(),
        workerId: z.string().optional(),
        workerSearch: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
      .parse(request.query);

    const uid = request.jwtUser.sub;

    const v = q.view ?? q.status;
    let tab: EmployerShiftTab = q.tab ?? 'active';
    if (!q.tab && v === 'completed') tab = 'completed';
    else if (!q.tab && v === 'needs_payment') tab = 'needs_payment';
    else if (!q.tab && v === 'active') tab = 'active';

    let workerUserId: string | undefined;
    if (q.workerId && q.workerId.trim() !== '') {
      const wp = await fastify.prisma.workerProfile.findUnique({
        where: { id: q.workerId },
        select: { userId: true },
      });
      workerUserId = wp?.userId ?? '__none__';
    }

    const workerSearchNorm = q.workerSearch?.trim();

    const bookingDateRange: Prisma.DateTimeFilter = {};
    const df = q.dateFrom?.trim();
    const dt = q.dateTo?.trim();
    if (df) bookingDateRange.gte = new Date(`${df}T00:00:00.000Z`);
    if (dt) bookingDateRange.lte = new Date(`${dt}T23:59:59.999Z`);

    const bookingParts: Prisma.BookingWhereInput[] = [];
    if (q.vacancyId && q.vacancyId.trim() !== '') {
      bookingParts.push({ linkedVacancyId: q.vacancyId });
    }
    if (Object.keys(bookingDateRange).length > 0) {
      bookingParts.push({ date: bookingDateRange });
    }
    if (workerSearchNorm) {
      bookingParts.push({
        worker: {
          OR: [
            { firstName: { contains: workerSearchNorm, mode: 'insensitive' } },
            { lastName: { contains: workerSearchNorm, mode: 'insensitive' } },
          ],
        },
      });
    }

    const bookingFilter: Prisma.BookingWhereInput | undefined =
      bookingParts.length === 1
        ? bookingParts[0]
        : bookingParts.length > 1
          ? { AND: bookingParts }
          : undefined;

    const hasBookingConstraint =
      bookingFilter !== undefined && Object.keys(bookingFilter).length > 0;

    const shiftBase: Prisma.ShiftWhereInput = {
      employerId: uid,
      ...(workerUserId ? { workerId: workerUserId } : {}),
      ...(hasBookingConstraint ? { booking: bookingFilter } : {}),
    };

    const paymentCompleted = { payments: { some: { status: ShiftPayStatus.COMPLETED } } };
    const paymentNotCompleted = { payments: { none: { status: ShiftPayStatus.COMPLETED } } };

    function tabWhere(t: EmployerShiftTab): Prisma.ShiftWhereInput {
      switch (t) {
        case 'pending_confirm':
          return {
            ...shiftBase,
            status: ShiftStatus.ACTIVE,
            workerConfirmed: true,
            employerConfirmed: false,
          };
        case 'active':
          return {
            ...shiftBase,
            status: { in: [ShiftStatus.PENDING, ShiftStatus.ACTIVE] },
            NOT: {
              status: ShiftStatus.ACTIVE,
              workerConfirmed: true,
              employerConfirmed: false,
            },
          };
        case 'completed':
          return {
            ...shiftBase,
            status: ShiftStatus.COMPLETED,
            ...paymentCompleted,
          };
        case 'needs_payment':
          return {
            ...shiftBase,
            status: ShiftStatus.COMPLETED,
            ...paymentNotCompleted,
          };
        case 'archive':
          return { ...shiftBase, status: { in: [ShiftStatus.CANCELLED, ShiftStatus.FAILED] } };
        case 'disputed':
          return { ...shiftBase, status: ShiftStatus.DISPUTED };
        case 'all':
        default:
          return { ...shiftBase };
      }
    }

    const listWhere = tabWhere(tab);

    const countsWhereBase = shiftBase;

    async function countWhere(extra: Prisma.ShiftWhereInput) {
      return fastify.prisma.shift.count({
        where: {
          AND: [countsWhereBase, extra],
        },
      });
    }

    const [
      total,
      shifts,
      cActive,
      cPendingConfirm,
      cCompleted,
      cNeedsPay,
      cArchive,
      cDisputed,
    ] = await Promise.all([
      fastify.prisma.shift.count({ where: listWhere }),
      fastify.prisma.shift.findMany({
        where: listWhere,
        orderBy:
          tab === 'needs_payment'
            ? { completedAt: 'asc' }
            : tab === 'completed'
              ? { completedAt: 'desc' }
              : { createdAt: 'desc' },
        skip: (q.page - 1) * q.perPage,
        take: q.perPage,
        include: {
          booking: {
            select: {
              id: true,
              date: true,
              timeStart: true,
              timeEnd: true,
              location: true,
              rate: true,
              description: true,
              linkedVacancy: { select: { id: true, title: true, dateStart: true } },
              worker: {
                select: {
                  id: true,
                  userId: true,
                  firstName: true,
                  lastName: true,
                  photoUrl: true,
                  ratingScore: true,
                },
              },
            },
          },
          reviews: { select: { id: true, reviewerId: true } },
          payments: { select: { id: true, status: true, amount: true } },
        },
      }),
      countWhere({
        status: { in: [ShiftStatus.PENDING, ShiftStatus.ACTIVE] },
        NOT: { status: ShiftStatus.ACTIVE, workerConfirmed: true, employerConfirmed: false },
      }),
      countWhere({
        status: ShiftStatus.ACTIVE,
        workerConfirmed: true,
        employerConfirmed: false,
      }),
      countWhere({
        status: ShiftStatus.COMPLETED,
        payments: { some: { status: ShiftPayStatus.COMPLETED } },
      }),
      countWhere({
        status: ShiftStatus.COMPLETED,
        payments: { none: { status: ShiftPayStatus.COMPLETED } },
      }),
      countWhere({
        status: { in: [ShiftStatus.CANCELLED, ShiftStatus.FAILED] },
      }),
      countWhere({
        status: ShiftStatus.DISPUTED,
      }),
    ]);

    return replyPaginated(reply, shifts, {
      total,
      page: q.page,
      perPage: q.perPage,
      totalPages: Math.ceil(total / q.perPage),
      tabCounts: {
        active: cActive,
        pending_confirm: cPendingConfirm,
        completed: cCompleted,
        needs_payment: cNeedsPay,
        archive: cArchive,
        disputed: cDisputed,
      },
    });
  });

  // PATCH /shifts/:id/confirm — только работодатель-владелец
  fastify.patch('/shifts/:id/confirm', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const uid = request.jwtUser.sub;
    const owned = await fastify.prisma.shift.findFirst({
      where: { id, employerId: uid },
      select: { id: true },
    });
    if (!owned) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Смена не найдена');
    }
    try {
      const shift = await confirmShiftParticipation(
        { prisma: fastify.prisma, notificationService: fastify.notificationService },
        id,
        uid,
      );
      return replyOk(reply, shift);
    } catch (e) {
      if (e instanceof ShiftConfirmationError) {
        return replyFail(reply, e.statusCode, e.code, e.messageRu);
      }
      throw e;
    }
  });

  // PATCH /shifts/:id/fail — отметить провал по вине работника (только работодатель)
  fastify.patch('/shifts/:id/fail', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const uid = request.jwtUser.sub;
    const body = z
      .object({
        reason: z.string().min(1).max(64),
        note: z.string().max(2000).optional(),
      })
      .parse(request.body);

    const shift = await fastify.prisma.shift.findUnique({ where: { id } });
    if (!shift || shift.employerId !== uid) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Смена не найдена');
    }
    if (shift.status === ShiftStatus.COMPLETED || shift.status === ShiftStatus.CANCELLED) {
      return replyFail(reply, 400, 'INVALID', 'Смена уже закрыта');
    }
    if (!(WORKER_FAILURE_CODES as readonly string[]).includes(body.reason)) {
      return replyFail(reply, 400, 'INVALID', 'Некорректная причина');
    }

    const failed = await fastify.prisma.shift.update({
      where: { id },
      data: {
        status: ShiftStatus.FAILED,
        failedBy: ShiftFailedBy.WORKER,
        failureCode: body.reason,
        failureNote: body.note,
        failureReason: body.reason,
      },
    });
    const rel = new ReliabilityService(fastify.prisma, fastify.notificationService);
    await rel.recalculate(shift.workerId);
    await rel.recalculate(shift.employerId);
    return replyOk(reply, failed);
  });

  // PATCH /shifts/:id/cancel — только PENDING, работодатель
  fastify.patch('/shifts/:id/cancel', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const uid = request.jwtUser.sub;

    const shift = await fastify.prisma.shift.findUnique({
      where: { id },
      include: {
        booking: { include: { worker: { include: { user: { select: { id: true } } } } } },
      },
    });
    if (!shift || shift.employerId !== uid) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Смена не найдена');
    }
    if (shift.status !== ShiftStatus.PENDING) {
      return replyFail(
        reply,
        400,
        'INVALID_STATE',
        'Отмена доступна только для смены в статусе «ожидание»',
      );
    }

    const updated = await fastify.prisma.shift.update({
      where: { id },
      data: {
        status: ShiftStatus.CANCELLED,
        cancellationReason: 'Отменено работодателем до начала',
        cancelledBy: uid,
        cancelledAt: new Date(),
      },
    });

    const workerUserIdInner = shift.booking.worker?.user?.id ?? shift.workerId;
    await fastify.notificationService.create({
      userId: workerUserIdInner,
      type: 'CANCELLATION',
      title: 'Смена отменена',
      body: 'Работодатель отменил смену до начала.',
      data: { shiftId: id, bookingId: shift.bookingId },
    });

    return replyOk(reply, updated);
  });

  // GET /invitations — sent invitations history
  fastify.get('/invitations', { preHandler: employerAuth }, async (request, reply) => {
    const query = z
      .object({ page: z.coerce.number().int().positive().default(1) })
      .parse(request.query);

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    const limit = 20;
    const where: Prisma.ApplicationWhereInput = {
      // Show all employer-initiated invitations regardless of worker's response
      status: { in: ['invited', 'confirmed', 'rejected', 'cancelled'] },
      vacancy: { employerId: profile.id },
    };

    const [total, rows] = await fastify.prisma.$transaction([
      fastify.prisma.application.count({ where }),
      fastify.prisma.application.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * limit,
        take: limit,
        include: {
          vacancy: { select: { id: true, title: true, dateStart: true } },
          worker: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        },
      }),
    ]);

    return replyPaginated(reply, rows, {
      total,
      page: query.page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  });

  // PATCH /bookings/:id — employer edits shift booking details (only when shift is PENDING)
  fastify.patch('/bookings/:id', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        date: z.string().datetime().optional(),
        timeStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
        timeEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
        location: z.string().max(500).nullable().optional(),
        rate: z.number().positive().optional(),
        description: z.string().max(2000).nullable().optional(),
      })
      .parse(request.body);

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');

    const booking = await fastify.prisma.booking.findFirst({
      where: { id, employerId: profile.id },
      include: {
        shifts: { select: { id: true, status: true, workerId: true } },
        worker: { select: { userId: true } },
      },
    });
    if (!booking) return replyFail(reply, 404, 'NOT_FOUND', 'Booking not found');

    const shift = booking.shifts[0];
    if (shift && shift.status !== ShiftStatus.PENDING) {
      return replyFail(reply, 400, 'INVALID_STATE', 'Редактировать можно только ожидающую смену');
    }

    const updated = await fastify.prisma.booking.update({
      where: { id },
      data: {
        ...(body.date !== undefined && { date: new Date(body.date) }),
        ...(body.timeStart !== undefined && { timeStart: body.timeStart }),
        ...(body.timeEnd !== undefined && { timeEnd: body.timeEnd }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.rate !== undefined && { rate: body.rate }),
        ...(body.description !== undefined && { description: body.description }),
      },
    });

    // Notify worker about updated shift details
    if (shift) {
      await fastify.notificationService.create({
        userId: booking.worker.userId,
        type: 'SHIFT_COMPLETED',
        title: 'Детали смены изменены',
        body: 'Работодатель обновил информацию о вашей смене. Проверьте дату и место.',
        data: { shiftId: shift.id, bookingId: id },
      });
    }

    return replyOk(reply, updated);
  });

  // GET /shifts-for-payment — paginated
  fastify.get<{ Querystring: { page?: string; perPage?: string } }>(
    '/shifts-for-payment',
    { preHandler: employerAuth },
    async (request, reply) => {
      const uid = request.jwtUser.sub;
      const page = Math.max(1, Number(request.query.page) || 1);
      const perPage = Math.min(50, Math.max(1, Number(request.query.perPage) || 20));
      const skip = (page - 1) * perPage;

      const where = { employerId: uid, status: ShiftStatus.COMPLETED };
      const [total, shifts] = await Promise.all([
        fastify.prisma.shift.count({ where }),
        fastify.prisma.shift.findMany({
          where,
          orderBy: { completedAt: 'desc' },
          skip,
          take: perPage,
          include: {
            booking: {
              include: {
                worker: { select: { firstName: true, lastName: true, id: true } },
              },
            },
            payments: true,
          },
        }),
      ]);

      return replyPaginated(reply, shifts, {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      });
    },
  );
};
