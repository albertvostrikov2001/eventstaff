import './env';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { prismaPlugin } from './plugins/prisma';
import { redisPlugin } from './plugins/redis';
import authPlugin from './plugins/auth';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { workerRoutes } from './routes/worker';
import { employerRoutes } from './routes/employer';
import { catalogRoutes } from './routes/catalog';
import { messagesRoutes } from './routes/messages';
import { adminRoutes } from './routes/admin';

const PORT = Number(process.env.API_PORT) || 4000;
const HOST = process.env.API_HOST || '0.0.0.0';
const isDev = process.env.NODE_ENV !== 'production';

async function buildApp() {
  const app = Fastify({
    logger: {
      level: isDev ? 'debug' : 'info',
      transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
    },
  });

  await app.register(cors, {
    origin: isDev
      ? ['http://localhost:3000', 'http://localhost:4000']
      : [process.env.NEXT_PUBLIC_SITE_URL ?? ''],
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: isDev ? false : undefined,
  });

  await app.register(sensible);

  await app.register(cookie, {
    secret: process.env.JWT_SECRET ?? 'cookie-secret',
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Unity API',
        description: 'Специализированная биржа труда для event-персонала',
        version: '1.0.0',
      },
      servers: [{ url: `http://localhost:${PORT}`, description: 'Development' }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);

  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(workerRoutes, { prefix: '/api/v1/worker' });
  await app.register(employerRoutes, { prefix: '/api/v1/employer' });
  await app.register(catalogRoutes, { prefix: '/api/v1/catalog' });
  await app.register(messagesRoutes, { prefix: '/api/v1/messages' });
  await app.register(adminRoutes, { prefix: '/api/v1/admin' });

  return app;
}

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Unity API running on http://${HOST}:${PORT}`);
    app.log.info(`Swagger docs: http://localhost:${PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
