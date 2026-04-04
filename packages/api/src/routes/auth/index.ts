import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { registerSchema, loginSchema } from '@unity/shared';

const BCRYPT_ROUNDS = 12;
const REFRESH_TTL = 60 * 60 * 24 * 30; // 30 days in seconds

function makeCookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

function generateSlug(prefix: string, id: string): string {
  return `${prefix}-${id.slice(-8)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /register
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existing = await fastify.prisma.user.findFirst({
      where: {
        OR: [
          body.email ? { email: body.email } : {},
          body.phone ? { phone: body.phone } : {},
        ].filter((o) => Object.keys(o).length > 0),
      },
    });

    if (existing) {
      return reply
        .status(409)
        .send({ error: { code: 'CONFLICT', message: 'Пользователь с таким email уже существует' } });
    }

    const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

    const user = await fastify.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: body.email,
          phone: body.phone,
          passwordHash,
          activeRole: body.role as 'worker' | 'employer',
          consentGivenAt: new Date(),
          roles: {
            create: { role: body.role as 'worker' | 'employer' },
          },
        },
      });

      const slug = generateSlug(body.role, newUser.id);

      if (body.role === 'worker') {
        await tx.workerProfile.create({
          data: {
            userId: newUser.id,
            slug,
            firstName: '',
            lastName: '',
            visibility: 'hidden',
          },
        });
      } else {
        await tx.employerProfile.create({
          data: {
            userId: newUser.id,
            slug,
            type: 'company',
          },
        });
      }

      return newUser;
    });

    const roles = [body.role];
    const accessToken = await fastify.signAccessToken({
      sub: user.id,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      roles,
      activeRole: body.role,
    });
    const refreshToken = await fastify.signRefreshToken(user.id);

    await fastify.redis.set(`refresh:${user.id}`, refreshToken, 'EX', REFRESH_TTL);

    reply
      .setCookie('access_token', accessToken, makeCookieOpts(15 * 60))
      .setCookie('refresh_token', refreshToken, makeCookieOpts(REFRESH_TTL));

    return reply.status(201).send({
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          roles,
          activeRole: body.role,
        },
      },
    });
  });

  // POST /login
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await fastify.prisma.user.findFirst({
      where: {
        OR: [{ email: body.login }, { phone: body.login }],
      },
      include: { roles: true },
    });

    if (!user || !user.passwordHash) {
      return reply
        .status(401)
        .send({ error: { code: 'UNAUTHORIZED', message: 'Неверный email или пароль' } });
    }

    if (user.status === 'banned' || user.status === 'deleted') {
      return reply
        .status(403)
        .send({ error: { code: 'FORBIDDEN', message: 'Аккаунт заблокирован' } });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return reply
        .status(401)
        .send({ error: { code: 'UNAUTHORIZED', message: 'Неверный email или пароль' } });
    }

    await fastify.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: request.ip },
    });

    const roles = user.roles.map((r) => r.role as string);
    const activeRole = (user.activeRole as string) ?? roles[0] ?? 'worker';

    const accessToken = await fastify.signAccessToken({
      sub: user.id,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      roles,
      activeRole,
    });
    const refreshToken = await fastify.signRefreshToken(user.id);

    await fastify.redis.set(`refresh:${user.id}`, refreshToken, 'EX', REFRESH_TTL);

    reply
      .setCookie('access_token', accessToken, makeCookieOpts(15 * 60))
      .setCookie('refresh_token', refreshToken, makeCookieOpts(REFRESH_TTL));

    return reply.send({
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          roles,
          activeRole,
        },
      },
    });
  });

  // POST /logout
  fastify.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies?.refresh_token;
    if (refreshToken) {
      try {
        const payload = await fastify.verifyRefreshToken(refreshToken);
        if (payload.sub) {
          await fastify.redis.del(`refresh:${payload.sub}`);
        }
      } catch {
        // ignore invalid token on logout
      }
    }

    reply
      .clearCookie('access_token', { path: '/' })
      .clearCookie('refresh_token', { path: '/' });

    return reply.send({ data: { success: true } });
  });

  // POST /refresh
  fastify.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies?.refresh_token;
    if (!refreshToken) {
      return reply
        .status(401)
        .send({ error: { code: 'UNAUTHORIZED', message: 'No refresh token' } });
    }

    let payload;
    try {
      payload = await fastify.verifyRefreshToken(refreshToken);
    } catch {
      return reply
        .status(401)
        .send({ error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' } });
    }

    const stored = await fastify.redis.get(`refresh:${payload.sub}`);
    if (stored !== refreshToken) {
      return reply
        .status(401)
        .send({ error: { code: 'UNAUTHORIZED', message: 'Refresh token revoked' } });
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id: payload.sub! },
      include: { roles: true },
    });

    if (!user) {
      return reply
        .status(401)
        .send({ error: { code: 'UNAUTHORIZED', message: 'User not found' } });
    }

    const roles = user.roles.map((r) => r.role as string);
    const activeRole = (user.activeRole as string) ?? roles[0] ?? 'worker';

    const newAccessToken = await fastify.signAccessToken({
      sub: user.id,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      roles,
      activeRole,
    });

    reply.setCookie('access_token', newAccessToken, makeCookieOpts(15 * 60));

    return reply.send({ data: { success: true } });
  });

  // GET /me
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.jwtUser.sub },
      include: {
        roles: true,
        workerProfile: true,
        employerProfile: true,
      },
    });

    if (!user) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const roles = user.roles.map((r) => r.role as string);

    return reply.send({
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          roles,
          activeRole: (user.activeRole as string) ?? roles[0],
          workerProfile: user.workerProfile,
          employerProfile: user.employerProfile,
        },
      },
    });
  });

  // POST /forgot-password (stub)
  fastify.post('/forgot-password', async (request, reply) => {
    const body = z.object({ login: z.string().min(1) }).parse(request.body);
    fastify.log.info({ login: body.login }, 'Password reset requested');
    // TODO: подключить email-провайдер на следующем этапе
    return reply.send({
      data: { message: 'Если email существует, письмо отправлено' },
    });
  });
};
