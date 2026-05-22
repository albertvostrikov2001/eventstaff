import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ComplaintStatus, Prisma, Role, ShiftStatus, UserStatus } from '@prisma/client';
import type { EmailLogStatus, InAppNotificationType } from '@prisma/client';
import { ReliabilityService } from '@/services/reliability-service';
import { IndividualRequestStatus } from '@prisma/client';
import { invalidateAllUserTokens } from '@/lib/refresh-tokens';
import { replyFail, replyOk, replyPaginated } from '../../lib/api-reply';
import { safeUserSelect } from '@/lib/safe-user-select';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const adminAuth = [fastify.authenticate, fastify.requireRole(['admin'])];

  // GET /users
  fastify.get('/users', { preHandler: adminAuth }, async (request, reply) => {
    const query = z
      .object({
        role: z.string().optional(),
        search: z.string().optional(),
        page: z.coerce.number().default(1),
      })
      .parse(request.query);

    const where: Prisma.UserWhereInput = {
      ...(query.role
        ? { roles: { some: { role: query.role as Role } } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { workerProfile: { firstName: { contains: query.search, mode: 'insensitive' } } },
              { workerProfile: { lastName: { contains: query.search, mode: 'insensitive' } } },
              { employerProfile: { companyName: { contains: query.search, mode: 'insensitive' } } },
              { employerProfile: { contactName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, users] = await fastify.prisma.$transaction([
      fastify.prisma.user.count({ where }),
      fastify.prisma.user.findMany({
        where,
        select: {
          ...safeUserSelect,
          roles: true,
          workerProfile: { select: { id: true, firstName: true, lastName: true, photoUrl: true, visibility: true, isVerified: true } },
          employerProfile: { select: { id: true, companyName: true, contactName: true, logoUrl: true, isVerified: true } },
          userReliabilityScore: { select: { isRestricted: true, strikeCount: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * 20,
        take: 20,
      }),
    ]);

    return replyPaginated(reply, users, {
      total,
      page: query.page,
      limit: 20,
      totalPages: Math.ceil(total / 20),
    });
  });

  // PATCH /users/:id/role
  fastify.patch('/users/:id/role', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({ role: z.enum(['worker', 'employer', 'admin', 'moderator']) })
      .parse(request.body);

    const user = await fastify.prisma.user.findUnique({
      where: { id },
      select: { ...safeUserSelect, roles: true },
    });
    if (!user) {
      return replyFail(reply, 404, 'NOT_FOUND', 'User not found');
    }

    await fastify.prisma.$transaction([
      fastify.prisma.userRole.upsert({
        where: { userId_role: { userId: id, role: body.role } },
        create: { userId: id, role: body.role },
        update: {},
      }),
      fastify.prisma.user.update({
        where: { id },
        data: { activeRole: body.role },
      }),
    ]);

    return replyOk(reply, { success: true });
  });

  // PATCH /employers/:id/verify
  fastify.patch('/employers/:id/verify', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ isVerified: z.boolean() }).parse(request.body);

    const profile = await fastify.prisma.employerProfile.findUnique({ where: { id } });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Employer not found');
    }

    const updated = await fastify.prisma.employerProfile.update({
      where: { id },
      data: {
        isVerified: body.isVerified,
        verifiedAt: body.isVerified ? new Date() : null,
      },
    });

    return replyOk(reply, updated);
  });

  // PATCH /workers/:id/visibility
  fastify.patch('/workers/:id/visibility', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({ visibility: z.enum(['public', 'hidden', 'verified_only', 'invite_only']) })
      .parse(request.body);

    const profile = await fastify.prisma.workerProfile.findUnique({ where: { id } });
    if (!profile) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Worker not found');
    }

    const updated = await fastify.prisma.workerProfile.update({
      where: { id },
      data: { visibility: body.visibility },
    });

    return replyOk(reply, updated);
  });

  // GET /vacancies
  fastify.get('/vacancies', { preHandler: adminAuth }, async (request, reply) => {
    const query = z
      .object({
        status: z.string().optional(),
        page: z.coerce.number().default(1),
      })
      .parse(request.query);

    const where: Prisma.VacancyWhereInput = query.status
      ? { status: query.status as Prisma.VacancyWhereInput['status'] }
      : {};

    const [total, vacancies] = await fastify.prisma.$transaction([
      fastify.prisma.vacancy.count({ where }),
      fastify.prisma.vacancy.findMany({
        where,
        include: {
          employer: { select: { companyName: true, contactName: true, isVerified: true } },
          city: true,
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * 20,
        take: 20,
      }),
    ]);

    return replyPaginated(reply, vacancies, {
      total,
      page: query.page,
      limit: 20,
      totalPages: Math.ceil(total / 20),
    });
  });

  // GET /applications
  fastify.get('/applications', { preHandler: adminAuth }, async (request, reply) => {
    const query = z
      .object({
        status: z.string().optional(),
        page: z.coerce.number().default(1),
      })
      .parse(request.query);

    const where: Prisma.ApplicationWhereInput = query.status
      ? { status: query.status as Prisma.ApplicationWhereInput['status'] }
      : {};

    const [total, applications] = await fastify.prisma.$transaction([
      fastify.prisma.application.count({ where }),
      fastify.prisma.application.findMany({
        where,
        include: {
          vacancy: {
            select: {
              title: true,
              employer: { select: { companyName: true, contactName: true } },
            },
          },
          worker: {
            select: { firstName: true, lastName: true, photoUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * 20,
        take: 20,
      }),
    ]);

    return replyPaginated(reply, applications, {
      total,
      page: query.page,
      limit: 20,
      totalPages: Math.ceil(total / 20),
    });
  });

  // GET /stats
  fastify.get('/stats', { preHandler: adminAuth }, async (_request, reply) => {
    const [users, activeVacancies, applications, verifiedEmployers] =
      await fastify.prisma.$transaction([
        fastify.prisma.user.count(),
        fastify.prisma.vacancy.count({ where: { status: 'active' } }),
        fastify.prisma.application.count(),
        fastify.prisma.employerProfile.count({ where: { isVerified: true } }),
      ]);

    return replyOk(reply, { users, activeVacancies, applications, verifiedEmployers });
  });

  fastify.get('/complaints', { preHandler: adminAuth }, async (request, reply) => {
    const query = z
      .object({
        status: z.string().optional(),
        type: z.string().optional(),
        page: z.coerce.number().default(1),
      })
      .parse(request.query);

    const where: Prisma.ComplaintWhereInput = {
      ...(query.status
        ? { status: query.status as Prisma.ComplaintWhereInput['status'] }
        : {}),
      ...(query.type ? { type: query.type as Prisma.ComplaintWhereInput['type'] } : {}),
    };

    const limit = 20;
    const [total, rows] = await fastify.prisma.$transaction([
      fastify.prisma.complaint.count({ where }),
      fastify.prisma.complaint.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * limit,
        take: limit,
        include: {
          author: { select: { id: true, email: true, activeRole: true } },
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

  fastify.get('/complaints/:id', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const c = await fastify.prisma.complaint.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, email: true, activeRole: true } },
        history: { orderBy: { createdAt: 'asc' } },
        resolver: { select: { id: true, email: true } },
      },
    });
    if (!c) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Not found');
    }
    return replyOk(reply, c);
  });

  fastify.patch('/complaints/:id/status', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        status: z.nativeEnum(ComplaintStatus),
        comment: z.string().max(4000).optional(),
        sanction: z.boolean().optional(),
      })
      .parse(request.body);
    const current = await fastify.prisma.complaint.findUnique({ where: { id } });
    if (!current) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Not found');
    }
    const adminId = request.jwtUser.sub;
    const rel = new ReliabilityService(fastify.prisma, fastify.notificationService);
    await fastify.prisma.$transaction([
      fastify.prisma.complaint.update({
        where: { id },
        data: {
          status: body.status,
          resolvedBy: body.status === 'RESOLVED' || body.status === 'REJECTED' ? adminId : undefined,
          resolvedAt: body.status === 'RESOLVED' || body.status === 'REJECTED' ? new Date() : undefined,
          sanctionApplied: body.sanction === true || current.sanctionApplied,
        },
      }),
      fastify.prisma.complaintHistory.create({
        data: {
          complaintId: id,
          adminId,
          action: 'status_change',
          comment: body.comment,
          oldStatus: current.status,
          newStatus: body.status,
        },
      }),
    ]);
    if (body.sanction && current.targetType === 'USER') {
      await rel.addStrikeAndRecalculate(current.targetId, 'Решение по жалобе');
    }
    await fastify.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'complaint_status',
        entityType: 'complaint',
        entityId: id,
        details: { status: body.status, sanction: body.sanction },
        ip: request.ip,
      },
    });
    await fastify.notificationService.create({
      userId: current.authorId,
      type: 'COMPLAINT_UPDATE',
      title: 'Жалоба обновлена',
      body: `Статус: ${body.status}${body.comment ? '. ' + body.comment.slice(0, 200) : ''}`,
      data: { complaintId: id },
    });
    const updated = await fastify.prisma.complaint.findUniqueOrThrow({ where: { id } });
    return replyOk(reply, updated);
  });

  fastify.patch('/users/:id/unrestrict', { preHandler: adminAuth }, async (request, reply) => {
    const { id: userId } = request.params as { id: string };
    const adminId = request.jwtUser.sub;
    const body = z
      .object({ reason: z.string().max(2000).optional() })
      .parse(request.body ?? {});

    await fastify.prisma.userReliabilityScore.upsert({
      where: { userId },
      create: { userId, strikeCount: 0, isRestricted: false },
      update: { strikeCount: 0, isRestricted: false, restrictedAt: null, restrictedReason: null },
    });
    const rel = new ReliabilityService(fastify.prisma, fastify.notificationService);
    await rel.recalculate(userId);
    await fastify.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'user.unrestrict',
        entityType: 'User',
        entityId: userId,
        details: { reason: body.reason ?? null },
        ip: request.ip,
      },
    });
    await fastify.notificationService.create({
      userId,
      type: 'SYSTEM',
      title: 'Ограничения сняты',
      body: 'Администратор снял ограничения с вашего аккаунта.',
      data: { unrestricted: true },
    });
    return replyOk(reply, { success: true });
  });

  fastify.patch('/users/:id/ban', { preHandler: adminAuth }, async (request, reply) => {
    const { id: userId } = request.params as { id: string };
    const body = z
      .object({ reason: z.string().min(10, 'Укажите причину (минимум 10 символов)').max(2000) })
      .parse(request.body ?? {});

    if (userId === request.jwtUser.sub) {
      return replyFail(reply, 400, 'INVALID', 'Cannot ban yourself');
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });
    if (!user) {
      return replyFail(reply, 404, 'NOT_FOUND', 'User not found');
    }

    const updated = await fastify.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.banned },
    });

    // Invalidate all active sessions immediately + add to banned blocklist (15 min TTL = access token lifetime)
    await invalidateAllUserTokens(fastify.redis, userId);
    await fastify.redis.setex(`banned:${userId}`, 900, '1');

    await fastify.prisma.adminAuditLog.create({
      data: {
        adminId: request.jwtUser.sub,
        action: 'user.ban',
        entityType: 'User',
        entityId: userId,
        details: { reason: body.reason },
        ip: request.ip,
      },
    });

    await fastify.notificationService.create({
      userId,
      type: 'SYSTEM',
      title: 'Аккаунт заблокирован',
      body: 'Администратор заблокировал ваш аккаунт.',
      data: { banned: true },
    });

    return replyOk(reply, updated);
  });

  fastify.patch('/users/:id/unban', { preHandler: adminAuth }, async (request, reply) => {
    const { id: userId } = request.params as { id: string };
    const body = z
      .object({ reason: z.string().max(2000).optional() })
      .parse(request.body ?? {});

    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });
    if (!user) {
      return replyFail(reply, 404, 'NOT_FOUND', 'User not found');
    }

    const updated = await fastify.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.active },
    });

    await fastify.prisma.adminAuditLog.create({
      data: {
        adminId: request.jwtUser.sub,
        action: 'user.unban',
        entityType: 'User',
        entityId: userId,
        details: { reason: body.reason ?? null },
        ip: request.ip,
      },
    });

    await fastify.notificationService.create({
      userId,
      type: 'SYSTEM',
      title: 'Аккаунт разблокирован',
      body: 'Администратор восстановил доступ к вашему аккаунту.',
      data: { unbanned: true },
    });

    return replyOk(reply, updated);
  });

  fastify.get('/email-logs', { preHandler: adminAuth }, async (request, reply) => {
    const query = z
      .object({
        status: z.enum(['PENDING', 'SENT', 'FAILED', 'BOUNCED']).optional(),
        type: z.string().optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        page: z.coerce.number().default(1),
      })
      .parse(request.query);

    const where: Prisma.EmailLogWhereInput = {
      ...(query.status ? { status: query.status as EmailLogStatus } : {}),
      ...(query.type ? { type: query.type as InAppNotificationType } : {}),
      ...((query.dateFrom ?? query.dateTo)
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: query.dateFrom } : {}),
              ...(query.dateTo ? { lte: query.dateTo } : {}),
            },
          }
        : {}),
    };

    const limit = 50;
    const [total, rows] = await fastify.prisma.$transaction([
      fastify.prisma.emailLog.count({ where }),
      fastify.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * limit,
        take: limit,
        select: {
          id: true,
          to: true,
          type: true,
          status: true,
          errorText: true,
          createdAt: true,
          subject: true,
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

  fastify.post<{ Params: { id: string } }>(
    '/email-logs/:id/retry',
    { preHandler: adminAuth },
    async (request, reply) => {
      try {
        await fastify.emailService.retrySend(request.params.id);
        return replyOk(reply, { success: true });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404) {
          return replyFail(reply, 404, 'NOT_FOUND', 'Log not found');
        }
        if (code === 400) {
          return replyFail(reply, 400, 'INVALID', (e as Error).message);
        }
        throw e;
      }
    },
  );

  fastify.get('/media/pending', { preHandler: adminAuth }, async (_request, reply) => {
    const rows = await fastify.mediaService.listPending();
    const data = rows.map((m) => ({
      id: m.id,
      type: m.type,
      url: m.url || null,
      filename: m.filename,
      mimeType: m.mimeType,
      size: m.size,
      createdAt: m.createdAt.toISOString(),
      user: {
        id: m.user.id,
        email: m.user.email,
        activeRole: m.user.activeRole,
        roles: m.user.roles.map((r) => r.role),
        displayName:
          m.user.workerProfile != null
            ? `${m.user.workerProfile.firstName} ${m.user.workerProfile.lastName}`.trim()
            : m.user.employerProfile?.companyName ||
              m.user.employerProfile?.contactName ||
              m.user.email ||
              m.user.id,
      },
    }));
    return replyOk(reply, data);
  });

  fastify.patch<{ Params: { id: string } }>(
    '/media/:id/approve',
    { preHandler: adminAuth },
    async (request, reply) => {
      const { id } = request.params;
      try {
        const media = await fastify.mediaService.approve(id, request.jwtUser.sub);
        await fastify.prisma.adminAuditLog.create({
          data: {
            adminId: request.jwtUser.sub,
            action: 'media_approve',
            entityType: 'media',
            entityId: id,
            details: { type: media.type, userId: media.userId },
            ip: request.ip,
          },
        });
        await fastify.notificationService.create({
          userId: media.userId,
          type: 'SYSTEM',
          title: 'Файл одобрен',
          body: `Модератор одобрил ваш файл (${media.type}).`,
          data: { mediaId: media.id },
        });
        return replyOk(reply, { success: true });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404) {
          return replyFail(reply, 404, 'NOT_FOUND', 'Не найдено');
        }
        if (code === 400) {
          return replyFail(reply, 400, 'INVALID', (e as Error).message);
        }
        throw e;
      }
    },
  );

  fastify.patch<{ Params: { id: string } }>(
    '/media/:id/reject',
    { preHandler: adminAuth },
    async (request, reply) => {
      const { id } = request.params;
      const body = z.object({ reason: z.string().max(4000).optional() }).parse(request.body ?? {});
      try {
        await fastify.mediaService.reject(id, request.jwtUser.sub, body.reason);
        const media = await fastify.prisma.media.findUnique({ where: { id } });
        await fastify.prisma.adminAuditLog.create({
          data: {
            adminId: request.jwtUser.sub,
            action: 'media_reject',
            entityType: 'media',
            entityId: id,
            details: { reason: body.reason ?? null, userId: media?.userId },
            ip: request.ip,
          },
        });
        if (media?.userId) {
          await fastify.notificationService.create({
            userId: media.userId,
            type: 'SYSTEM',
            title: 'Файл отклонён',
            body: body.reason
              ? `Модератор отклонил файл. Причина: ${body.reason}`
              : 'Модератор отклонил загруженный файл.',
            data: { mediaId: id },
          });
        }
        return replyOk(reply, { success: true });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404) {
          return replyFail(reply, 404, 'NOT_FOUND', 'Не найдено');
        }
        if (code === 400) {
          return replyFail(reply, 400, 'INVALID', (e as Error).message);
        }
        throw e;
      }
    },
  );

  fastify.get('/audit-log', { preHandler: adminAuth }, async (request, reply) => {
    const q = z
      .object({
        adminId: z.string().optional(),
        action: z.string().optional(),
        page: z.coerce.number().default(1),
      })
      .parse(request.query);
    const limit = 50;
    const where: Prisma.AdminAuditLogWhereInput = {
      ...(q.adminId ? { adminId: q.adminId } : {}),
      ...(q.action ? { action: { contains: q.action, mode: 'insensitive' } } : {}),
    };
    const [total, rows] = await fastify.prisma.$transaction([
      fastify.prisma.adminAuditLog.count({ where }),
      fastify.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * limit,
        take: limit,
        include: { admin: { select: { id: true, email: true } } },
      }),
    ]);
    return replyPaginated(reply, rows, {
      total,
      page: q.page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  });

  fastify.get('/dashboard-summary', { preHandler: adminAuth }, async (_request, reply) => {
    const [
      newComplaints,
      pendingMedia,
      newIndividualRequests,
      restrictedUsers,
    ] = await fastify.prisma.$transaction([
      fastify.prisma.complaint.count({ where: { status: { in: ['NEW', 'IN_PROGRESS'] } } }),
      fastify.prisma.media.count({ where: { isApproved: false, isRejected: false } }),
      fastify.prisma.individualRequest.count({ where: { status: 'NEW' } }),
      fastify.prisma.userReliabilityScore.count({ where: { isRestricted: true } }),
    ]);
    return replyOk(reply, {
      newComplaints,
      pendingMedia,
      newIndividualRequests,
      restrictedUsers,
    });
  });

  fastify.get('/individual-requests', { preHandler: adminAuth }, async (request, reply) => {
    const q = z
      .object({
        role: z.string().optional(),
        status: z.string().optional(),
        page: z.coerce.number().default(1),
        createdFrom: z.string().optional(),
        createdTo: z.string().optional(),
        search: z.string().optional(),
      })
      .parse(request.query);
    const limit = 30;
    const search = q.search?.trim();
    const createdFrom = q.createdFrom?.trim() ? new Date(q.createdFrom) : null;
    const createdToRaw = q.createdTo?.trim() ? new Date(q.createdTo) : null;
    const createdTo =
      createdToRaw && !Number.isNaN(createdToRaw.getTime())
        ? (() => {
            const end = new Date(createdToRaw.getTime());
            end.setHours(23, 59, 59, 999);
            return end;
          })()
        : null;

    const where: Prisma.IndividualRequestWhereInput = {
      ...(q.role ? { role: q.role as Prisma.IndividualRequestWhereInput['role'] } : {}),
      ...(q.status
        ? { status: q.status as Prisma.IndividualRequestWhereInput['status'] }
        : {}),
      ...(createdFrom && !Number.isNaN(createdFrom.getTime())
        ? { createdAt: { gte: createdFrom } }
        : {}),
      ...(createdTo && !Number.isNaN(createdTo.getTime())
        ? {
            createdAt:
              createdFrom && !Number.isNaN(createdFrom.getTime())
                ? { gte: createdFrom, lte: createdTo }
                : { lte: createdTo },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, rows] = await fastify.prisma.$transaction([
      fastify.prisma.individualRequest.count({ where }),
      fastify.prisma.individualRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * limit,
        take: limit,
        include: {
          createdBy: { select: { id: true, email: true } },
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

  fastify.get('/individual-requests/:id', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await fastify.prisma.individualRequest.findUnique({ where: { id } });
    if (!row) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Not found');
    }
    return replyOk(reply, row);
  });

  fastify.patch('/individual-requests/:id', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        status: z.nativeEnum(IndividualRequestStatus).optional(),
        adminComment: z.string().max(8000).optional(),
      })
      .parse(request.body ?? {});
    const cur = await fastify.prisma.individualRequest.findUnique({ where: { id } });
    if (!cur) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Not found');
    }
    const updated = await fastify.prisma.individualRequest.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.adminComment !== undefined ? { adminComment: body.adminComment } : {}),
      },
    });
    await fastify.prisma.adminAuditLog.create({
      data: {
        adminId: request.jwtUser.sub,
        action: 'individual_request_update',
        entityType: 'individual_request',
        entityId: id,
        details: { status: body.status, hasComment: Boolean(body.adminComment) },
        ip: request.ip,
      },
    });
    return replyOk(reply, updated);
  });

  // ─── Disputed Shifts ──────────────────────────────────────────────────────

  // GET /admin/shifts — list shifts with optional status filter (defaults to DISPUTED)
  fastify.get('/shifts', { preHandler: adminAuth }, async (request, reply) => {
    const query = z
      .object({
        status: z.nativeEnum(ShiftStatus).optional().default(ShiftStatus.DISPUTED),
        page: z.coerce.number().int().positive().default(1),
      })
      .parse(request.query);

    const limit = 20;
    const where: Prisma.ShiftWhereInput = { status: query.status };

    const [total, shifts] = await fastify.prisma.$transaction([
      fastify.prisma.shift.count({ where }),
      fastify.prisma.shift.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * limit,
        take: limit,
        include: {
          booking: {
            include: {
              linkedVacancy: { select: { id: true, title: true, dateStart: true } },
              worker: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
              employer: { select: { id: true, companyName: true, contactName: true } },
            },
          },
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

  // PATCH /admin/shifts/:id/resolve — resolve a disputed shift
  fastify.patch('/shifts/:id/resolve', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        outcome: z.enum(['WORKER_FAULT', 'EMPLOYER_FAULT', 'MUTUAL']),
        note: z.string().max(2000).optional(),
      })
      .parse(request.body);

    const shift = await fastify.prisma.shift.findUnique({
      where: { id },
      include: {
        booking: { include: { worker: { select: { userId: true, id: true } }, employer: { select: { userId: true } } } },
      },
    });

    if (!shift) {
      return replyFail(reply, 404, 'NOT_FOUND', 'Смена не найдена');
    }
    if (shift.status !== ShiftStatus.DISPUTED) {
      return replyFail(reply, 400, 'INVALID_STATE', 'Смена не является спорной');
    }

    const reliabilityService = new ReliabilityService(fastify.prisma, fastify.notificationService);

    // Determine new status + reliability impact
    let newShiftStatus: ShiftStatus = ShiftStatus.COMPLETED;
    if (body.outcome === 'WORKER_FAULT') {
      newShiftStatus = ShiftStatus.FAILED;
    }
    // EMPLOYER_FAULT and MUTUAL → shift completes normally, worker not penalized

    const [updated] = await fastify.prisma.$transaction([
      fastify.prisma.shift.update({
        where: { id },
        data: { status: newShiftStatus },
      }),
      fastify.prisma.adminAuditLog.create({
        data: {
          adminId: request.jwtUser.sub,
          action: 'shift.resolve',
          entityType: 'Shift',
          entityId: id,
          details: { outcome: body.outcome, note: body.note ?? null, newStatus: newShiftStatus },
          ip: request.ip,
        },
      }),
    ]);

    // Recalculate reliability for worker if needed
    if (body.outcome === 'WORKER_FAULT' && shift.booking?.worker?.userId) {
      await reliabilityService.recalculate(shift.booking.worker.userId).catch(() => {});
    }

    return replyOk(reply, updated);
  });

  // GET /admin/contact-requests
  fastify.get('/contact-requests', { preHandler: adminAuth }, async (request, reply) => {
    const query = z.object({
      status: z.enum(['new', 'read', 'replied']).optional(),
      page: z.coerce.number().default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
    }).parse(request.query);

    const where = query.status ? { status: query.status } : {};
    const [total, items] = await fastify.prisma.$transaction([
      fastify.prisma.contactRequest.count({ where }),
      fastify.prisma.contactRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return replyPaginated(reply, items, {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    });
  });

  // PATCH /admin/contact-requests/:id
  fastify.patch('/contact-requests/:id', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      status: z.enum(['new', 'read', 'replied']).optional(),
      adminNote: z.string().max(2000).optional(),
    }).parse(request.body);

    const updated = await fastify.prisma.contactRequest.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.adminNote !== undefined ? { adminNote: body.adminNote } : {}),
      },
    });

    return replyOk(reply, updated);
  });
};
