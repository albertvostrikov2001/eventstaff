import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

export const messagesRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = [fastify.authenticate];

  // GET /conversations
  fastify.get('/conversations', { preHandler: auth }, async (request, reply) => {
    const userId = request.jwtUser.sub;

    const conversations = await fastify.prisma.conversation.findMany({
      where: {
        participantIds: { has: userId },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Enrich with the other participant info
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const otherIds = conv.participantIds.filter((id) => id !== userId);
        const otherUsers = await fastify.prisma.user.findMany({
          where: { id: { in: otherIds } },
          include: {
            workerProfile: { select: { firstName: true, lastName: true, photoUrl: true } },
            employerProfile: { select: { companyName: true, contactName: true, logoUrl: true } },
          },
        });
        return { ...conv, participants: otherUsers };
      }),
    );

    return reply.send({ data: enriched });
  });

  // POST /conversations — find or create
  fastify.post('/conversations', { preHandler: auth }, async (request, reply) => {
    const body = z.object({ recipientId: z.string() }).parse(request.body);
    const userId = request.jwtUser.sub;

    if (userId === body.recipientId) {
      return reply
        .status(400)
        .send({ error: { code: 'INVALID', message: 'Cannot message yourself' } });
    }

    const existing = await fastify.prisma.conversation.findFirst({
      where: {
        participantIds: { hasEvery: [userId, body.recipientId] },
      },
    });

    if (existing) {
      return reply.send({ data: existing });
    }

    const conv = await fastify.prisma.conversation.create({
      data: {
        participantIds: [userId, body.recipientId],
      },
    });

    return reply.status(201).send({ data: conv });
  });

  // GET /conversations/:id
  fastify.get('/conversations/:id', { preHandler: auth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = z.object({ after: z.string().optional() }).parse(request.query);
    const userId = request.jwtUser.sub;

    const conv = await fastify.prisma.conversation.findFirst({
      where: {
        id,
        participantIds: { has: userId },
      },
    });

    if (!conv) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    const messages = await fastify.prisma.message.findMany({
      where: {
        conversationId: id,
        ...(query.after ? { id: { gt: query.after } } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            workerProfile: { select: { firstName: true, lastName: true, photoUrl: true } },
            employerProfile: { select: { companyName: true, contactName: true, logoUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    // Mark messages as read
    await fastify.prisma.message.updateMany({
      where: {
        conversationId: id,
        receiverId: userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return reply.send({ data: { conversation: conv, messages } });
  });

  // POST /conversations/:id/messages
  fastify.post('/conversations/:id/messages', { preHandler: auth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ content: z.string().min(1).max(5000) }).parse(request.body);
    const userId = request.jwtUser.sub;

    const conv = await fastify.prisma.conversation.findFirst({
      where: {
        id,
        participantIds: { has: userId },
      },
    });

    if (!conv) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Conversation not found' } });
    }

    const receiverId = conv.participantIds.find((pid) => pid !== userId)!;

    const message = await fastify.prisma.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        receiverId,
        content: body.content,
      },
    });

    await fastify.prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    return reply.status(201).send({ data: message });
  });
};
