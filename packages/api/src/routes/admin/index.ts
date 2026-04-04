import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

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

    const where: Parameters<typeof fastify.prisma.user.findMany>[0]['where'] = {
      ...(query.role
        ? { roles: { some: { role: query.role as Parameters<typeof fastify.prisma.userRole.findMany>[0]['where']['role'] } } }
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

    const where: Parameters<typeof fastify.prisma.vacancy.findMany>[0]['where'] = query.status
      ? { status: query.status as Parameters<typeof fastify.prisma.vacancy.findMany>[0]['where']['status'] }
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

    const where: Parameters<typeof fastify.prisma.application.findMany>[0]['where'] = query.status
      ? { status: query.status as Parameters<typeof fastify.prisma.application.findMany>[0]['where']['status'] }
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
};
