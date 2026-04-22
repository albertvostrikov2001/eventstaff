import type { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string' },
                redis: { type: 'string' },
              },
            },
          },
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string' },
                redis: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      let dbStatus = 'disconnected';
      let redisStatus = 'disconnected';

      try {
        await fastify.prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
      } catch {
        dbStatus = 'error';
      }

      try {
        const pong = await fastify.redis.ping();
        redisStatus = pong === 'PONG' ? 'connected' : 'error';
      } catch {
        redisStatus = 'error';
      }

      const allHealthy = dbStatus === 'connected' && redisStatus === 'connected';

      return reply.status(allHealthy ? 200 : 503).send({
        status: allHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          redis: redisStatus,
        },
      });
    },
  });
}
