import { ApplicationStatus, BookingStatus, BusinessType, type Vacancy, Prisma, ShiftStatus, ShiftFailedBy } from '@prisma/client';
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

    const inviteUsage = await subSvc.canEmployerInvite(profile.id);
    const invitationUsage = {
      used: inviteUsage.used,
      limit: inviteUsage.limit,
      unlimited: inviteUsage.limit === -1,
    };

    if (vacancyIds.length === 0) {
      return replyOk(reply, {
        pendingApplicationsCount: 0,
        totalApplicationsCount: 0,
        invitationUsage,
      });
    }

    const baseWhere: Prisma.ApplicationWhereInput = { vacancyId: { in: vacancyIds } };

    // "Ждут ответа" = ещё не обработанные откликом работодателя.
    // viewed означает лишь "работодатель открыл", но реакция (принять/отклонить) ещё нужна.
    const [pendingApplicationsCount, totalApplicationsCount] = await fastify.prisma.$transaction([
      fastify.prisma.application.count({
        where: {
          ...baseWhere,
          status: { in: [ApplicationStatus.pending, ApplicationStatus.viewed] },
        },
      }),
      fastify.prisma.application.count({ where: baseWhere }),
    ]);

    return replyOk(reply, { pendingApplicationsCount, totalApplicationsCount, invitationUsage });
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

    // Mark seen applications as "viewed" — only in the unfiltered review view.
    if (!q.status) {
      const pendingIds = applications.filter((a) => a.status === 'pending').map((a) => a.id);
      if (pendingIds.length > 0) {
        await fastify.prisma.application.updateMany({
          where: { id: { in: pendingIds }, status: 'pending' },
          data: { status: 'viewed' },
        });
        for (const a of applications) {
          if (a.status === 'pending') a.status = 'viewed';
        }
      }
    }

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

    // Notify and cancel still-open applications (pending/viewed/invited) so candidates aren't left waiting.
    const openApps = await fastify.prisma.application.findMany({
      where: { vacancyId: id, status: { in: ['pending', 'viewed', 'invited'] } },
      include: { worker: { include: { user: { select: { id: true, email: true } } } } },
    });
    if (openApps.length > 0) {
      await fastify.prisma.application.updateMany({
        where: { vacancyId: id, status: { in: ['pending', 'viewed', 'invited'] } },
        data: { status: 'cancelled' },
      });
      const site = publicSiteUrl();
      for (const app of openApps) {
        const wUser = app.worker.user;
        if (!wUser) continue;
        await fastify.notificationService.create({
          userId: wUser.id,
          type: 'CANCELLATION',
          title: 'Вакансия закрыта',
          body: `Работодатель закрыл вакансию «${vacancy.title}». Отклик больше неактуален.`,
          data: { vacancyId: id, applicationId: app.id },
        });
        if (wUser.email) {
          await fastify.emailService.queue({
            userId: wUser.id,
            to: wUser.email,
            type: 'CANCELLATION',
            templateData: {
              vacancyTitle: vacancy.title,
              cancelledByRole: 'Работодатель',
              cancellationReason: 'Вакансия закрыта работодателем',
              ctaUrl: `${site}/worker/applications`,
            },
          });
        }
      }
    }

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

    // Mark freshly-seen applications as "viewed" so the worker knows the employer saw them.
    const pendingIds = applications.filter((a) => a.status === 'pending').map((a) => a.id);
    if (pendingIds.length > 0) {
      await fastify.prisma.application.updateMany({
        where: { id: { in: pendingIds }, status: 'pending' },
        data: { status: 'viewed' },
      });
      for (const a of applications) {
        if (a.status === 'pending') a.status = 'viewed';
      }
    }

    return replyOk(reply, applications);
  });

  // PATCH /applications/:id/status
  fastify.patch('/applications/:id/status', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({ status: z.enum(['confirmed', 'rejected', 'invited', 'cancelled', 'interview']) })
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
      } else if (body.status === 'interview') {
        await fastify.notificationService.create({
          userId: worker.user.id,
          type: 'APPLICATION_RESPONSE',
          title: 'Работодатель на связи',
          body: `«${employerName}» хочет обсудить вакансию «${application.vacancy.title}». Откройте чат.`,
          data: { applicationId: id, vacancyId: application.vacancyId, status: 'interview' },
        });
      }
    }

    return replyOk(reply, updated);
  });

  // PATCH /applications/bulk — массовое действие над откликами
  fastify.patch('/applications/bulk', { preHandler: employerAuth }, async (request, reply) => {
    const body = z
      .object({
        ids: z.array(z.string()).min(1).max(100),
        action: z.enum(['reject', 'interview']),
      })
      .parse(request.body);

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true, companyName: true, contactName: true },
    });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');
    }

    // Only act on applications belonging to this employer's vacancies.
    const apps = await fastify.prisma.application.findMany({
      where: { id: { in: body.ids }, vacancy: { employerId: profile.id } },
      include: {
        vacancy: { select: { id: true, title: true } },
        worker: { include: { user: { select: { id: true } } } },
      },
    });
    if (apps.length === 0) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Отклики не найдены');
    }

    const newStatus = body.action === 'reject' ? 'rejected' : 'interview';
    const actionableIds = apps
      .filter((a) =>
        body.action === 'reject'
          ? !['rejected', 'cancelled', 'confirmed'].includes(a.status)
          : ['pending', 'viewed'].includes(a.status),
      )
      .map((a) => a.id);

    if (actionableIds.length > 0) {
      await fastify.prisma.application.updateMany({
        where: { id: { in: actionableIds } },
        data: { status: newStatus as Parameters<typeof fastify.prisma.application.update>[0]['data']['status'] },
      });

      const employerName = profile.companyName || profile.contactName || 'Работодатель';
      for (const a of apps) {
        if (!actionableIds.includes(a.id)) continue;
        const wUserId = a.worker.user?.id;
        if (!wUserId) continue;
        await fastify.notificationService.create({
          userId: wUserId,
          type: 'APPLICATION_RESPONSE',
          title: body.action === 'reject' ? 'Ответ по отклику' : 'Работодатель на связи',
          body:
            body.action === 'reject'
              ? `Ваш отклик на «${a.vacancy.title}» отклонён`
              : `«${employerName}» хочет обсудить вакансию «${a.vacancy.title}». Откройте чат.`,
          data: { applicationId: a.id, vacancyId: a.vacancy.id, status: newStatus },
        });
      }
    }

    return replyOk(reply, { updated: actionableIds.length });
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

    // Check invitation limit
    const canInvite = await subSvc.canEmployerInvite(profile.id);
    if (canInvite.limit === 0) {
      return replyFail(reply, 403, 'UPGRADE_REQUIRED', 'Отправка приглашений недоступна на вашем тарифе. Перейдите на тариф Бизнес или Про.');
    }
    if (!canInvite.allowed) {
      return replyFail(reply, 403, 'INVITATION_LIMIT_REACHED', `Вы исчерпали лимит приглашений в этом месяце (${canInvite.limit}). Лимит обновится в начале следующего месяца.`, { used: canInvite.used, limit: canInvite.limit });
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
      'archive',
      'disputed',
      'all',
    ] as const;

    type EmployerShiftTab = (typeof employerShiftTabs)[number];

    const q = z
      .object({
        tab: z.enum(employerShiftTabs).optional(),
        view: z.enum(['active', 'completed']).optional(),
        /** Старый фронт: ?status= вместо tab/view */
        status: z.enum(['active', 'completed']).optional(),
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
      cArchive,
      cDisputed,
    ] = await Promise.all([
      fastify.prisma.shift.count({ where: listWhere }),
      fastify.prisma.shift.findMany({
        where: listWhere,
        orderBy:
          tab === 'completed'
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

  // ── VACANCY BOOSTS ─────────────────────────────────────────────────────────

  // POST /vacancies/:id/boost — boost a vacancy (check monthly limit)
  fastify.post('/vacancies/:id/boost', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true, boostCredits: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');

    const vacancy = await fastify.prisma.vacancy.findFirst({
      where: { id, employerId: profile.id },
    });
    if (!vacancy) return replyFail(reply, 404, 'NOT_FOUND', 'Vacancy not found');

    const sub = await subSvc.getEmployerSubscription(profile.id);

    // Разрешён ли буст по тарифу (безлимит или в пределах месячного лимита)?
    let allowedBySub = false;
    if (sub.monthlyBoosts === -1) {
      allowedBySub = true;
    } else if (sub.monthlyBoosts > 0) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const usedThisMonth = await fastify.prisma.vacancyBoost.count({
        where: { employerId: profile.id, createdAt: { gte: monthStart } },
      });
      allowedBySub = usedThisMonth < sub.monthlyBoosts;
    }

    // Если по тарифу нельзя — пробуем потратить купленный буст из пакета.
    let usedCredit = false;
    if (!allowedBySub) {
      if (profile.boostCredits > 0) {
        usedCredit = true;
      } else if (sub.monthlyBoosts === 0) {
        return replyFail(reply, 403, 'UPGRADE_REQUIRED', 'Буст вакансий доступен с тарифа Бизнес или при покупке пакета бустов.');
      } else {
        return replyFail(reply, 403, 'BOOST_LIMIT_REACHED', `Лимит бустов в этом месяце исчерпан (${sub.monthlyBoosts}). Купите дополнительный буст или пакет.`, { limit: sub.monthlyBoosts });
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const boost = await fastify.prisma.vacancyBoost.create({
      data: { vacancyId: id, employerId: profile.id, expiresAt },
    });
    if (usedCredit) {
      await fastify.prisma.employerProfile.update({
        where: { id: profile.id },
        data: { boostCredits: { decrement: 1 } },
      });
    }

    return replyOk(reply, { ...boost, expiresAt, usedCredit }, 201);
  });

  // GET /vacancies/:id/boost — get boost status
  fastify.get('/vacancies/:id/boost', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');

    const now = new Date();
    const activeBoost = await fastify.prisma.vacancyBoost.findFirst({
      where: { vacancyId: id, employerId: profile.id, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });

    const sub = await subSvc.getEmployerSubscription(profile.id);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const usedThisMonth = await fastify.prisma.vacancyBoost.count({
      where: { employerId: profile.id, createdAt: { gte: monthStart } },
    });

    return replyOk(reply, {
      isActive: !!activeBoost,
      expiresAt: activeBoost?.expiresAt ?? null,
      usedThisMonth,
      monthlyLimit: sub.monthlyBoosts,
      canBoost: sub.monthlyBoosts === -1 || usedThisMonth < sub.monthlyBoosts,
    });
  });

  // ── TEMPLATES ──────────────────────────────────────────────────────────────

  // GET /templates
  fastify.get('/templates', { preHandler: employerAuth }, async (request, reply) => {
    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');

    const sub = await subSvc.getEmployerSubscription(profile.id);
    const templates = await fastify.prisma.vacancyTemplate.findMany({
      where: { employerId: profile.id },
      orderBy: { createdAt: 'desc' },
    });

    return replyOk(reply, {
      templates,
      used: templates.length,
      limit: sub.maxTemplates,
      canCreate: sub.maxTemplates === -1 || templates.length < sub.maxTemplates,
      planKey: sub.key,
    });
  });

  // POST /templates
  fastify.post('/templates', { preHandler: employerAuth }, async (request, reply) => {
    const body = z.object({
      name: z.string().min(1).max(100),
      vacancyData: z.record(z.unknown()),
    }).parse(request.body);

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');

    const sub = await subSvc.getEmployerSubscription(profile.id);
    if (sub.maxTemplates === 0) {
      return replyFail(reply, 403, 'UPGRADE_REQUIRED', 'Шаблоны вакансий доступны с тарифа Бизнес.');
    }
    if (sub.maxTemplates !== -1) {
      const count = await fastify.prisma.vacancyTemplate.count({
        where: { employerId: profile.id },
      });
      if (count >= sub.maxTemplates) {
        return replyFail(reply, 403, 'TEMPLATE_LIMIT_REACHED', `Лимит шаблонов исчерпан (${sub.maxTemplates} из ${sub.maxTemplates}). Перейдите на тариф Про для безлимитных шаблонов.`, { used: count, limit: sub.maxTemplates });
      }
    }

    const template = await fastify.prisma.vacancyTemplate.create({
      data: { employerId: profile.id, name: body.name, vacancyData: body.vacancyData },
    });
    return replyOk(reply, template, 201);
  });

  // GET /templates/:id
  fastify.get('/templates/:id', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');

    const template = await fastify.prisma.vacancyTemplate.findFirst({
      where: { id, employerId: profile.id },
    });
    if (!template) return replyFail(reply, 404, 'NOT_FOUND', 'Template not found');
    return replyOk(reply, template);
  });

  // PUT /templates/:id
  fastify.put('/templates/:id', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      name: z.string().min(1).max(100).optional(),
      vacancyData: z.record(z.unknown()).optional(),
    }).parse(request.body);

    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');

    const existing = await fastify.prisma.vacancyTemplate.findFirst({
      where: { id, employerId: profile.id },
    });
    if (!existing) return replyFail(reply, 404, 'NOT_FOUND', 'Template not found');

    const updated = await fastify.prisma.vacancyTemplate.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.vacancyData !== undefined ? { vacancyData: body.vacancyData } : {}),
      },
    });
    return replyOk(reply, updated);
  });

  // DELETE /templates/:id
  fastify.delete('/templates/:id', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');

    const existing = await fastify.prisma.vacancyTemplate.findFirst({
      where: { id, employerId: profile.id },
    });
    if (!existing) return replyFail(reply, 404, 'NOT_FOUND', 'Template not found');

    await fastify.prisma.vacancyTemplate.delete({ where: { id } });
    return replyOk(reply, { deleted: true });
  });

  // POST /templates/:id/use — create vacancy draft from template
  fastify.post('/templates/:id/use', { preHandler: employerAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');

    const template = await fastify.prisma.vacancyTemplate.findFirst({
      where: { id, employerId: profile.id },
    });
    if (!template) return replyFail(reply, 404, 'NOT_FOUND', 'Template not found');

    const data = template.vacancyData as Record<string, unknown>;
    const vacancy = await fastify.prisma.vacancy.create({
      data: {
        employerId: profile.id,
        title: String(data.title ?? template.name),
        category: (data.category as Parameters<typeof fastify.prisma.vacancy.create>[0]['data']['category']) ?? 'other',
        rate: Number(data.rate ?? 0),
        rateType: (data.rateType as Parameters<typeof fastify.prisma.vacancy.create>[0]['data']['rateType']) ?? 'per_shift',
        employmentType: (data.employmentType as Parameters<typeof fastify.prisma.vacancy.create>[0]['data']['employmentType']) ?? 'single_shift',
        dateStart: new Date(String(data.dateStart ?? new Date().toISOString())),
        workersNeeded: Number(data.workersNeeded ?? 1),
        description: data.description ? String(data.description) : undefined,
        requirements: data.requirements ? String(data.requirements) : undefined,
        conditions: data.conditions ? String(data.conditions) : undefined,
        responsibilities: data.responsibilities ? String(data.responsibilities) : undefined,
        address: data.address ? String(data.address) : undefined,
        status: 'draft',
      },
    });

    return replyOk(reply, vacancy, 201);
  });

  // ── ANALYTICS ──────────────────────────────────────────────────────────────

  // GET /analytics
  fastify.get('/analytics', { preHandler: employerAuth }, async (request, reply) => {
    const profile = await fastify.prisma.employerProfile.findUnique({
      where: { userId: request.jwtUser.sub },
      select: { id: true },
    });
    if (!profile) return replyFail(reply, 404, 'NOT_FOUND', 'Profile not found');

    const sub = await subSvc.getEmployerSubscription(profile.id);
    if (!sub.hasAnalytics) {
      return replyFail(reply, 403, 'UPGRADE_REQUIRED', 'Аналитика доступна с тарифа Бизнес.');
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // All vacancies with applications
    const vacancies = await fastify.prisma.vacancy.findMany({
      where: { employerId: profile.id },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        publishedAt: true,
        _count: { select: { applications: true } },
        applications: { select: { status: true, createdAt: true, workerId: true } },
      },
    });

    const total = vacancies.length;
    const active = vacancies.filter((v) => v.status === 'active').length;
    const archived = vacancies.filter((v) => v.status === 'archived').length;
    const paused = vacancies.filter((v) => v.status === 'paused').length;

    const allApplications = vacancies.flatMap((v) =>
      v.applications.map((a) => ({ ...a, vacancyId: v.id })),
    );
    const totalResponses = allApplications.length;
    const thisMonthResponses = allApplications.filter(
      (a) => (a.createdAt as Date) >= monthStart,
    ).length;

    // Responses by day (last 30 days)
    const byDayMap = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      byDayMap.set(d.toISOString().split('T')[0], 0);
    }
    for (const app of allApplications) {
      if ((app.createdAt as Date) >= thirtyDaysAgo) {
        const key = (app.createdAt as Date).toISOString().split('T')[0];
        byDayMap.set(key, (byDayMap.get(key) ?? 0) + 1);
      }
    }
    const byDay = [...byDayMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top 3 vacancies by responses
    const topVacancies = [...vacancies]
      .sort((a, b) => b._count.applications - a._count.applications)
      .slice(0, 3)
      .map((v) => ({ id: v.id, title: v.title, responsesCount: v._count.applications }));

    // Invitation / confirmation stats
    const invited = allApplications.filter(
      (a) => a.status === 'invited' || a.status === 'confirmed' || a.status === 'rejected',
    ).length;
    const accepted = allApplications.filter((a) => a.status === 'confirmed').length;
    const conversionRate = invited > 0 ? Math.round((accepted / invited) * 100) : 0;

    const result: Record<string, unknown> = {
      plan: sub.key,
      period: { from: thirtyDaysAgo.toISOString(), to: now.toISOString() },
      vacancies: { total, active, archived, paused },
      responses: { total: totalResponses, thisMonth: thisMonthResponses, byDay },
      topVacancies,
      invitations: { sent: invited, accepted, conversionRate },
    };

    // Advanced analytics for PRO / ENTERPRISE
    if (sub.key === 'pro' || sub.key === 'enterprise') {
      // Geography of applicants
      const workerIds = [...new Set(allApplications.map((a) => a.workerId).filter(Boolean))];
      const workers = await fastify.prisma.workerProfile.findMany({
        where: { id: { in: workerIds } },
        select: { city: { select: { name: true } } },
      });
      const geoCounts = new Map<string, number>();
      for (const w of workers) {
        if (w.city?.name) geoCounts.set(w.city.name, (geoCounts.get(w.city.name) ?? 0) + 1);
      }
      const geography = [...geoCounts.entries()]
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Avg time to first response (hours)
      const timesToFirst: number[] = [];
      for (const v of vacancies) {
        if (v.publishedAt && v.applications.length > 0) {
          const sorted = [...v.applications].sort(
            (a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime(),
          );
          timesToFirst.push(
            ((sorted[0].createdAt as Date).getTime() - (v.publishedAt as Date).getTime()) /
              (1000 * 3600),
          );
        }
      }
      const avgTimeToFirstResponse =
        timesToFirst.length > 0
          ? Math.round(timesToFirst.reduce((a, b) => a + b, 0) / timesToFirst.length)
          : null;

      result.advanced = { geography, avgTimeToFirstResponse };
    }

    return replyOk(reply, result);
  });
};
