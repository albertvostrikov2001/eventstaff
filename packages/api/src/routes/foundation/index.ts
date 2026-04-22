import type { FastifyPluginAsync } from 'fastify';

const stub = () => ({ success: true, data: null, message: 'Not implemented' as const });

/**
 * Стадия 2: заглушки маршрутов (без бизнес-логики).
 * Префикс: /api/v1
 */
export const foundationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/complaints', async (_request, reply) => reply.status(200).send(stub()));
  fastify.post('/complaints', async (_request, reply) => reply.status(200).send(stub()));

  fastify.get('/notifications', async (_request, reply) => reply.status(200).send(stub()));
  fastify.patch<{
    Params: { id: string };
  }>('/notifications/:id/read', async (_request, reply) => reply.status(200).send(stub()));

  fastify.get('/notifications/preferences', async (_request, reply) => reply.status(200).send(stub()));
  fastify.patch('/notifications/preferences', async (_request, reply) => reply.status(200).send(stub()));

  fastify.get<{
    Params: { id: string };
  }>('/shifts/:id', async (_request, reply) => reply.status(200).send(stub()));
  fastify.patch<{
    Params: { id: string };
  }>('/shifts/:id/confirm', async (_request, reply) => reply.status(200).send(stub()));

  fastify.get<{
    Params: { userId: string };
  }>('/reliability/:userId', async (_request, reply) => reply.status(200).send(stub()));

  fastify.get('/individual-requests', async (_request, reply) => reply.status(200).send(stub()));
  fastify.post('/individual-requests', async (_request, reply) => reply.status(200).send(stub()));

  fastify.get('/media', async (_request, reply) => reply.status(200).send(stub()));
  fastify.post('/media/upload', async (_request, reply) => reply.status(200).send(stub()));
  fastify.delete<{
    Params: { id: string };
  }>('/media/:id', async (_request, reply) => reply.status(200).send(stub()));
};
