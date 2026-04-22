import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ComplaintStatus, Prisma, Role, UserStatus } from '@prisma/client';
import type { EmailLogStatus, InAppNotificationType } from '@prisma/client';
import { ReliabilityService } from '@/services/reliability-service';
import { IndividualRequestStatus } from '@prisma/client';

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
        include: {
          roles: true,
          workerProfile: { select: { id: true, firstName: true, lastName: true, photoUrl: true, visibility: true, isVerified: true } },
          employerProfile: { select: { id: true, companyName: true, contactName: true, logoUrl: true, isVerified: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * 20,
        take: 20,
      }),
    ]);

    return reply.send({
      data: users,
      meta: { total, page: query.page, limit: 20, totalPages: Math.ceil(total / 20) },
    });
  });

  // PATCH /users/:id/role
  fastify.patch('/users/:id/role', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({ role: z.enum(['worker', 'employer', 'admin', 'moderator']) })
      .parse(request.body);

    const user = await fastify.prisma.user.findUnique({ where: { id }, include: { roles: true } });
    if (!user) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
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

    return reply.send({ data: { success: true } });
  });

  // PATCH /employers/:id/verify
  fastify.patch('/employers/:id/verify', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ isVerified: z.boolean() }).parse(request.body);

    const profile = await fastify.prisma.employerProfile.findUnique({ where: { id } });
    if (!profile) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Employer not found' } });
    }

    const updated = await fastify.prisma.employerProfile.update({
      where: { id },
      data: {
        isVerified: body.isVerified,
        verifiedAt: body.isVerified ? new Date() : null,
      },
    });

    return reply.send({ data: updated });
  });

  // PATCH /workers/:id/visibility
  fastify.patch('/workers/:id/visibility', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({ visibility: z.enum(['public', 'hidden', 'verified_only', 'invite_only']) })
      .parse(request.body);

    const profile = await fastify.prisma.workerProfile.findUnique({ where: { id } });
    if (!profile) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Worker not found' } });
    }

    const updated = await fastify.prisma.workerProfile.update({
      where: { id },
      data: { visibility: body.visibility },
    });

    return reply.send({ data: updated });
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

    return reply.send({
      data: vacancies,
      meta: { total, page: query.page, limit: 20, totalPages: Math.ceil(total / 20) },
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

    return reply.send({
      data: applications,
      meta: { total, page: query.page, limit: 20, totalPages: Math.ceil(total / 20) },
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

    return reply.send({
      data: { users, activeVacancies, applications, verifiedEmployers },
    });
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

    return reply.send({
      data: rows,
      meta: { total, page: query.page, limit, totalPages: Math.ceil(total / limit) },
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
      return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
    }
    return reply.send({ data: c });
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
      return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
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
    return reply.send({ data: updated });
  });

  fastify.patch('/users/:id/unrestrict', { preHandler: adminAuth }, async (request, reply) => {
    const { id: userId } = request.params as { id: string };
    const adminId = request.jwtUser.sub;
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
        action: 'user_unrestrict',
        entityType: 'user',
        entityId: userId,
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
    return reply.send({ data: { success: true } });
  });

  fastify.patch('/users/:id/ban', { preHandler: adminAuth }, async (request, reply) => {
    const { id: userId } = request.params as { id: string };
    if (userId === request.jwtUser.sub) {
      return reply.status(400).send({ error: { code: 'INVALID' } });
    }
    await fastify.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.banned },
    });
    await fastify.prisma.adminAuditLog.create({
      data: {
        adminId: request.jwtUser.sub,
        action: 'user_ban',
        entityType: 'user',
        entityId: userId,
        ip: request.ip,
      },
    });
    await fastify.notificationService.create({
      userId,
      type: 'SYSTEM',
      title: 'Аккаунт заблокирован',
      body: 'Администратор ограничил доступ к аккаунту.',
      data: { banned: true },
    });
    return reply.send({ data: { success: true } });
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

    return reply.send({
      data: rows,
      meta: { total, page: query.page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  fastify.post<{ Params: { id: string } }>(
    '/email-logs/:id/retry',
    { preHandler: adminAuth },
    async (request, reply) => {
      try {
        await fastify.emailService.retrySend(request.params.id);
        return reply.send({ data: { success: true } });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404) {
          return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Log not found' } });
        }
        if (code === 400) {
          return reply.status(400).send({ error: { code: 'INVALID', message: (e as Error).message } });
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
    return reply.send({ data });
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
        return reply.send({ data: { success: true } });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404) {
          return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Не найдено' } });
        }
        if (code === 400) {
          return reply.status(400).send({ error: { code: 'INVALID', message: (e as Error).message } });
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
        return reply.send({ data: { success: true } });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404) {
          return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Не найдено' } });
        }
        if (code === 400) {
          return reply.status(400).send({ error: { code: 'INVALID', message: (e as Error).message } });
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
    return reply.send({
      data: rows,
      meta: { total, page: q.page, limit, totalPages: Math.ceil(total / limit) },
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
    return reply.send({
      data: {
        newComplaints,
        pendingMedia,
        newIndividualRequests,
        restrictedUsers,
      },
    });
  });

  fastify.get('/individual-requests', { preHandler: adminAuth }, async (request, reply) => {
    const q = z
      .object({
        role: z.string().optional(),
        status: z.string().optional(),
        page: z.coerce.number().default(1),
      })
      .parse(request.query);
    const limit = 30;
    const where: Prisma.IndividualRequestWhereInput = {
      ...(q.role ? { role: q.role as Prisma.IndividualRequestWhereInput['role'] } : {}),
      ...(q.status
        ? { status: q.status as Prisma.IndividualRequestWhereInput['status'] }
        : {}),
    };
    const [total, rows] = await fastify.prisma.$transaction([
      fastify.prisma.individualRequest.count({ where }),
      fastify.prisma.individualRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * limit,
        take: limit,
      }),
    ]);
    return reply.send({
      data: rows,
      meta: { total, page: q.page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  fastify.get('/individual-requests/:id', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await fastify.prisma.individualRequest.findUnique({ where: { id } });
    if (!row) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
    }
    return reply.send({ data: row });
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
      return reply.status(404).send({ error: { code: 'NOT_FOUND' } });
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
    return reply.send({ data: updated });
  });
};
