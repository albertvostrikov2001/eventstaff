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
import { foundationRoutes } from './routes/foundation';

const PORT = Number(process.env.API_PORT) || 4000;
const HOST = process.env.API_HOST || '0.0.0.0';
const isDev = process.env.NODE_ENV !== 'production';

function isLocalBrowserOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

function extraCorsOrigins(): string[] {
  return (
    process.env.CORS_ORIGINS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  );
}

/** Browser Origin header is scheme+host+port only (no path). Normalize config URLs. */
function toOrigin(urlOrOrigin: string): string | null {
  const s = urlOrOrigin.trim();
  if (!s) return null;
  try {
    if (s.startsWith('http://') || s.startsWith('https://')) {
      return new URL(s).origin;
    }
  } catch {
    /* fall through */
  }
  return s;
}

function productionCorsOrigins(): string[] {
  const out = new Set<string>();
  for (const raw of extraCorsOrigins()) {
    const o = toOrigin(raw);
    if (o) out.add(o);
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    const o = toOrigin(site);
    if (o) out.add(o);
  }
  return [...out];
}

async function buildApp() {
  const app = Fastify({
    logger: {
      level: isDev ? 'debug' : 'info',
      transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
    },
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (isDev) {
        if (isLocalBrowserOrigin(origin)) return cb(null, origin);
        const extra = extraCorsOrigins();
        if (extra.includes(origin)) return cb(null, origin);
        return cb(null, false);
      }
      const allowed = productionCorsOrigins();
      if (allowed.includes(origin)) return cb(null, origin);
      return cb(null, false);
    },
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
  await app.register(foundationRoutes, { prefix: '/api/v1' });

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
