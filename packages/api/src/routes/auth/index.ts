import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { registerSchema, loginSchema } from '@unity/shared';
import { customAlphabet } from 'nanoid';
import {
  storeRefreshToken,
  consumeRefreshToken,
  invalidateAllUserTokens,
  removeRefreshToken,
} from '@/lib/refresh-tokens';
import { ok } from '@/lib/response';
import { publicSiteUrl } from '@/lib/public-site-url';

const nanoidToken = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  64,
);

const BCRYPT_ROUNDS = 12;
const REFRESH_TTL = 60 * 60 * 24 * 30; // 30 days in seconds
const RESET_TOKEN_TTL = 3600; // 1 hour in seconds

const nanoidSlug = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

function makeCookieOpts(maxAge: number) {
  const prod = process.env.NODE_ENV === 'production';
  const crossSite =
    prod &&
    (process.env.AUTH_COOKIE_SAME_SITE === 'none' || process.env.AUTH_CROSS_SITE_COOKIES === 'true');
  return {
    httpOnly: true,
    secure: prod && (process.env.NEXT_PUBLIC_SITE_URL || '').startsWith('https://'),
    sameSite: (crossSite ? 'none' : 'lax') as 'lax' | 'none',
    path: '/',
    maxAge,
  };
}

function generateSlug(prefix: string, id: string): string {
  return `${prefix}-${id.slice(-8)}-${nanoidSlug()}`;
}


export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /register — max 5 per hour per IP
  fastify.post('/register', { config: { rateLimit: { max: 5, timeWindow: '1 hour', keyGenerator: (req) => `register:${req.ip}` } } }, async (request, reply) => {
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

      await tx.notificationPreferences.create({
        data: { userId: newUser.id },
      });

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
    const refreshToken = nanoidToken();

    await storeRefreshToken(fastify.redis, user.id, refreshToken);

    reply
      .setCookie('access_token', accessToken, makeCookieOpts(15 * 60))
      .setCookie('refresh_token', refreshToken, makeCookieOpts(REFRESH_TTL));

    return ok(reply.status(201), {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        roles,
        activeRole: body.role,
      },
    });
  });

  // POST /login — max 5 attempts per 15 min per IP
  fastify.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
        keyGenerator: (req) => `login:${req.ip}`,
        errorResponseBuilder: (_req, context) => ({
          error: {
            code: 'TOO_MANY_ATTEMPTS',
            message: 'Слишком много попыток входа. Попробуйте через 15 минут.',
            retryAfter: Math.floor(context.ttl / 1000),
          },
        }),
      },
    },
  }, async (request, reply) => {
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
    const refreshToken = nanoidToken();

    await storeRefreshToken(fastify.redis, user.id, refreshToken);

    reply
      .setCookie('access_token', accessToken, makeCookieOpts(15 * 60))
      .setCookie('refresh_token', refreshToken, makeCookieOpts(REFRESH_TTL));

    return ok(reply, {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        roles,
        activeRole,
      },
    });
  });

  // POST /logout
  fastify.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies?.refresh_token;
    if (refreshToken) {
      try {
        // Resolve userId from token (token-keyed storage)
        const userId = await fastify.redis.get(`refresh:${refreshToken}`);
        if (userId) {
          await removeRefreshToken(fastify.redis, userId, refreshToken);
        }
      } catch {
        // ignore errors on logout
      }
    }

    reply
      .clearCookie('access_token', { path: '/' })
      .clearCookie('refresh_token', { path: '/' });

    return ok(reply, { success: true });
  });

  // POST /refresh — full token rotation with theft detection
  fastify.post('/refresh', async (request, reply) => {
    const oldToken = request.cookies?.refresh_token;
    if (!oldToken) {
      return reply
        .status(401)
        .send({ error: { code: 'UNAUTHORIZED', message: 'No refresh token' } });
    }

    // Atomically consume the old token — returns userId if valid, null if already consumed
    const userId = await consumeRefreshToken(fastify.redis, oldToken);

    if (!userId) {
      // Token was already consumed or never existed → possible theft
      // Try to resolve userId from legacy key format for backward compat
      const legacyUserId = await fastify.redis.get(`refresh:${oldToken}`).catch(() => null);
      if (legacyUserId) {
        // Legacy token found — invalidate all sessions for safety
        await invalidateAllUserTokens(fastify.redis, legacyUserId).catch(() => {});
      }
      reply
        .clearCookie('access_token', { path: '/' })
        .clearCookie('refresh_token', { path: '/' });
      return reply
        .status(401)
        .send({ error: { code: 'POSSIBLE_TOKEN_THEFT', message: 'Refresh token reuse detected' } });
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user) {
      return reply
        .status(401)
        .send({ error: { code: 'UNAUTHORIZED', message: 'User not found' } });
    }

    // Ban check — invalidate session for banned/deleted accounts
    if (user.status === 'banned' || user.status === 'deleted') {
      await invalidateAllUserTokens(fastify.redis, userId).catch(() => {});
      reply
        .clearCookie('access_token', { path: '/' })
        .clearCookie('refresh_token', { path: '/' });
      return reply
        .status(401)
        .send({ error: { code: 'ACCOUNT_BANNED', message: 'Account is banned' } });
    }

    const roles = user.roles.map((r) => r.role as string);
    const activeRole = (user.activeRole as string) ?? roles[0] ?? 'worker';

    // Issue new access token + new refresh token (rotation)
    const [newAccessToken, newRefreshToken] = await Promise.all([
      fastify.signAccessToken({
        sub: user.id,
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        roles,
        activeRole,
      }),
      Promise.resolve(nanoidToken()),
    ]);

    await storeRefreshToken(fastify.redis, user.id, newRefreshToken);

    reply
      .setCookie('access_token', newAccessToken, makeCookieOpts(15 * 60))
      .setCookie('refresh_token', newRefreshToken, makeCookieOpts(REFRESH_TTL));

    return ok(reply, { success: true });
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

    return ok(reply, {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        roles,
        activeRole: (user.activeRole as string) ?? roles[0],
        workerProfile: user.workerProfile,
        employerProfile: user.employerProfile,
      },
    });
  });

  // POST /forgot-password
  fastify.post('/forgot-password', async (request, reply) => {
    const body = z.object({ email: z.string().min(1) }).parse(request.body);

    // Manual rate limit: max 3 attempts per IP per 15 minutes
    const rateLimitKey = `reset_rl:${request.ip}`;
    const currentAttempts = await fastify.redis.get(rateLimitKey);
    if (currentAttempts && parseInt(currentAttempts, 10) >= 3) {
      return reply
        .status(429)
        .send({ error: { code: 'RATE_LIMIT', message: 'Слишком много запросов. Повторите через 15 минут.' } });
    }
    const newCount = await fastify.redis.incr(rateLimitKey);
    if (newCount === 1) {
      await fastify.redis.expire(rateLimitKey, 900); // 15 minutes
    }

    // Always return 200 to not reveal whether email exists
    const successMsg = { message: 'Если email зарегистрирован, письмо придёт в течение нескольких минут' };

    const user = await fastify.prisma.user.findFirst({
      where: { email: body.email },
      include: {
        workerProfile: { select: { firstName: true } },
        employerProfile: { select: { contactName: true, companyName: true } },
      },
    });

    if (!user || !user.email) {
      return ok(reply, successMsg);
    }

    if (user.status === 'banned' || user.status === 'deleted') {
      return ok(reply, successMsg);
    }

    const resetToken = randomBytes(32).toString('hex');
    await fastify.redis.setex(`reset:${resetToken}`, RESET_TOKEN_TTL, user.id);

    const name =
      user.workerProfile?.firstName ||
      user.employerProfile?.contactName ||
      user.employerProfile?.companyName ||
      user.email;

    const resetUrl = `${publicSiteUrl()}/auth/reset-password?token=${resetToken}`;

    await fastify.emailService.queue({
      userId: user.id,
      to: user.email,
      type: 'PASSWORD_RESET',
      templateData: { name, resetUrl },
    });

    return ok(reply, successMsg);
  });

  // POST /reset-password
  fastify.post('/reset-password', async (request, reply) => {
    const body = z
      .object({
        token: z.string().min(1),
        password: z.string().min(8, 'Минимум 8 символов').max(128),
      })
      .parse(request.body);

    const userId = await fastify.redis.get(`reset:${body.token}`);
    if (!userId) {
      return reply.status(400).send({
        error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'Ссылка устарела или уже была использована' },
      });
    }

    const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

    await fastify.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate reset token so it can't be reused
    await fastify.redis.del(`reset:${body.token}`);

    // Invalidate all active sessions for this user (rotation-aware)
    await invalidateAllUserTokens(fastify.redis, userId);

    return ok(reply, { message: 'Пароль успешно изменён' });
  });
};
