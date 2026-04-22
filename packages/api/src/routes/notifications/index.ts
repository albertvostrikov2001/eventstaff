import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const preferencesBody = z.object({
  emailInvitation: z.boolean().optional(),
  emailCancellation: z.boolean().optional(),
  emailReview: z.boolean().optional(),
  emailComplaint: z.boolean().optional(),
  emailNewApplication: z.boolean().optional(),
  emailApplicationReply: z.boolean().optional(),
});

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = [fastify.authenticate];

  fastify.get('/notifications', { preHandler: auth }, async (request, reply) => {
    const q = z
      .object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(20),
        unreadOnly: z
          .enum(['true', 'false'])
          .optional()
          .transform((v) => v === 'true'),
      })
      .parse(request.query);

    const result = await fastify.notificationService.getForUser(request.jwtUser.sub, {
      page: q.page,
      limit: q.limit,
      unreadOnly: q.unreadOnly,
    });

    return reply.send({
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  });

  fastify.get('/notifications/unread-count', { preHandler: auth }, async (request, reply) => {
    const count = await fastify.notificationService.getUnreadCount(request.jwtUser.sub);
    return reply.send({ data: { count } });
  });

  fastify.patch<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: auth },
    async (request, reply) => {
      try {
        await fastify.notificationService.markRead(request.params.id, request.jwtUser.sub);
        return reply.send({ data: { success: true } });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404) {
          return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Notification not found' } });
        }
        throw e;
      }
    },
  );

  fastify.post('/notifications/read-all', { preHandler: auth }, async (request, reply) => {
    await fastify.notificationService.markAllRead(request.jwtUser.sub);
    return reply.send({ data: { success: true } });
  });

  fastify.get('/notifications/preferences', { preHandler: auth }, async (request, reply) => {
    await fastify.notificationService.ensurePreferences(request.jwtUser.sub);
    const prefs = await fastify.prisma.notificationPreferences.findUniqueOrThrow({
      where: { userId: request.jwtUser.sub },
    });
    return reply.send({
      data: {
        emailInvitation: prefs.emailInvitation,
        emailCancellation: prefs.emailCancellation,
        emailReview: prefs.emailReview,
        emailComplaint: prefs.emailComplaint,
        emailNewApplication: prefs.emailNewApplication,
        emailApplicationReply: prefs.emailApplicationReply,
      },
    });
  });

  fastify.patch('/notifications/preferences', { preHandler: auth }, async (request, reply) => {
    const body = preferencesBody.parse(request.body ?? {});
    await fastify.notificationService.ensurePreferences(request.jwtUser.sub);
    const prefs = await fastify.prisma.notificationPreferences.update({
      where: { userId: request.jwtUser.sub },
      data: body,
    });
    return reply.send({
      data: {
        emailInvitation: prefs.emailInvitation,
        emailCancellation: prefs.emailCancellation,
        emailReview: prefs.emailReview,
        emailComplaint: prefs.emailComplaint,
        emailNewApplication: prefs.emailNewApplication,
        emailApplicationReply: prefs.emailApplicationReply,
      },
    });
  });
};
