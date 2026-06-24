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
import { ok, fail } from '@/lib/response';
import { publicSiteUrl } from '@/lib/public-site-url';
import {
  authUserWithRolesSelect,
  safeUserSelect,
  safeUserWithRolesSelect,
} from '@/lib/safe-user-select';

const nanoidToken = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  64,
);
const nanoidCode = customAlphabet('0123456789', 6);

const BCRYPT_ROUNDS = 12;
const REFRESH_TTL = 60 * 60 * 24 * 30; // 30 days in seconds
const RESET_TOKEN_TTL = 3600; // 1 hour in seconds
const VERIFY_CODE_TTL = 600; // 10 minutes in seconds
const VERIFY_LINK_TTL = 60 * 60 * 24; // 24 hours — срок жизни ссылки подтверждения
const VERIFY_RESEND_COOLDOWN = 60; // 1 minute cooldown between resends
const MAX_VERIFY_ATTEMPTS = 5; // max wrong attempts before invalidation

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
  // Helper: send (or re-send) an email verification code for a given user
  async function sendVerificationCode(userId: string, email: string): Promise<void> {
    const code = nanoidCode();
    await fastify.redis.setex(`verify:email:code:${userId}`, VERIFY_CODE_TTL, code);
    // Reset attempt counter
    await fastify.redis.del(`verify:email:attempts:${userId}`);
    await fastify.emailService.queue({
      userId: null, // system email — skip preference checks
      to: email,
      type: 'EMAIL_VERIFICATION',
      templateData: { code, email },
    });
  }

  // Подтверждение почты по ССЫЛКЕ (не код): письмо со ссылкой не триггерит анти-OTP-фильтры
  // почтовиков и доставляется надёжнее. Токен живёт 24 часа.
  async function sendVerificationLink(userId: string, email: string): Promise<void> {
    const token = nanoidToken();
    await fastify.redis.setex(`verify:email:link:${token}`, VERIFY_LINK_TTL, userId);
    const verifyUrl = `${publicSiteUrl()}/auth/verify-email?token=${token}`;
    await fastify.emailService.queue({
      userId: null, // system email — skip preference checks
      to: email,
      type: 'EMAIL_VERIFICATION',
      templateData: { verifyUrl, email },
    });
  }

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
      select: { id: true, emailVerified: true, createdAt: true },
    });

    // Верификация email больше не обязательна — любой существующий аккаунт
    // (подтверждён он или нет) считается реальным, поэтому это конфликт.
    if (existing) {
      return fail(reply, 409, 'CONFLICT', 'Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);

    const user = await fastify.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: body.email,
          phone: body.phone,
          passwordHash,
          emailVerified: false,
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
        const isIndividual = body.employerType === 'individual';
        await tx.employerProfile.create({
          data: {
            userId: newUser.id,
            slug,
            type: isIndividual ? 'individual' : 'company',
            businessType: isIndividual ? 'individual' : 'other',
          },
        });
      }

      await tx.notificationPreferences.create({
        data: { userId: newUser.id },
      });

      return newUser;
    });

    // Email-регистрация: обязательное подтверждение почты по ссылке из письма.
    // Токены НЕ выдаём, пока пользователь не перейдёт по ссылке (verify-email-link).
    if (user.email) {
      try {
        await sendVerificationLink(user.id, user.email);
      } catch {
        // Сбой доставки не должен валить регистрацию — ссылку можно запросить повторно.
      }
      return ok(reply.status(201), { pendingUserId: user.id, email: user.email });
    }

    // Phone-only: подтверждение почты не требуется — выдаём токены сразу.
    const roles = [body.role];
    const accessToken = await fastify.signAccessToken({
      sub: user.id,
      email: undefined,
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

  // POST /verify-email — max 10 per hour per IP
  fastify.post('/verify-email', { config: { rateLimit: { max: 10, timeWindow: '1 hour', keyGenerator: (req) => `verify-email:${req.ip}` } } }, async (request, reply) => {
    const body = z.object({
      userId: z.string().min(1),
      code: z.string().length(6),
    }).parse(request.body);

    const user = await fastify.prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, email: true, phone: true, emailVerified: true, activeRole: true, roles: true },
    });

    if (!user) {
      return fail(reply, 404, 'NOT_FOUND', 'Пользователь не найден');
    }

    if (user.emailVerified) {
      // Already verified — just log them in
      const roles = user.roles.map((r) => r.role as string);
      const activeRole = (user.activeRole as string) ?? roles[0] ?? 'worker';
      const accessToken = await fastify.signAccessToken({ sub: user.id, email: user.email ?? undefined, phone: user.phone ?? undefined, roles, activeRole });
      const refreshToken = nanoidToken();
      await storeRefreshToken(fastify.redis, user.id, refreshToken);
      reply
        .setCookie('access_token', accessToken, makeCookieOpts(15 * 60))
        .setCookie('refresh_token', refreshToken, makeCookieOpts(REFRESH_TTL));
      return ok(reply, { user: { id: user.id, email: user.email, phone: user.phone, roles, activeRole } });
    }

    // Check attempt limit
    const attemptsKey = `verify:email:attempts:${body.userId}`;
    const attempts = await fastify.redis.incr(attemptsKey);
    if (attempts === 1) await fastify.redis.expire(attemptsKey, VERIFY_CODE_TTL);
    if (attempts > MAX_VERIFY_ATTEMPTS) {
      await fastify.redis.del(`verify:email:code:${body.userId}`);
      return fail(reply, 429, 'TOO_MANY_ATTEMPTS', 'Слишком много попыток. Запросите новый код.');
    }

    // Verify code
    const stored = await fastify.redis.get(`verify:email:code:${body.userId}`);
    if (!stored || stored !== body.code) {
      const remaining = MAX_VERIFY_ATTEMPTS - attempts;
      return fail(reply, 400, 'INVALID_CODE', remaining > 0
        ? `Неверный код. Осталось попыток: ${remaining}`
        : 'Неверный код. Лимит попыток исчерпан.');
    }

    // Mark verified
    await fastify.prisma.user.update({
      where: { id: body.userId },
      data: { emailVerified: true },
    });
    await fastify.redis.del(`verify:email:code:${body.userId}`);
    await fastify.redis.del(attemptsKey);

    // Issue tokens
    const roles = user.roles.map((r) => r.role as string);
    const activeRole = (user.activeRole as string) ?? roles[0] ?? 'worker';
    const accessToken = await fastify.signAccessToken({ sub: user.id, email: user.email ?? undefined, phone: user.phone ?? undefined, roles, activeRole });
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

  // POST /resend-verify — max 3 per 15 min per IP
  fastify.post('/resend-verify', { config: { rateLimit: { max: 3, timeWindow: '15 minutes', keyGenerator: (req) => `resend-verify:${req.ip}` } } }, async (request, reply) => {
    const body = z.object({ userId: z.string().min(1) }).parse(request.body);

    const user = await fastify.prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user || !user.email) {
      return fail(reply, 404, 'NOT_FOUND', 'Пользователь не найден');
    }
    if (user.emailVerified) {
      return fail(reply, 400, 'ALREADY_VERIFIED', 'Email уже подтверждён');
    }

    // Per-user resend cooldown
    const cooldownKey = `verify:email:resend:${body.userId}`;
    const onCooldown = await fastify.redis.get(cooldownKey);
    if (onCooldown) {
      const ttl = await fastify.redis.ttl(cooldownKey);
      return fail(reply, 429, 'RESEND_COOLDOWN', `Повторная отправка возможна через ${ttl} сек.`);
    }
    await fastify.redis.setex(cooldownKey, VERIFY_RESEND_COOLDOWN, '1');

    await sendVerificationLink(user.id, user.email);

    return ok(reply, { message: 'Ссылка для подтверждения отправлена повторно' });
  });

  // POST /verify-email-link — подтверждение почты по токену из ссылки в письме
  fastify.post('/verify-email-link', { config: { rateLimit: { max: 20, timeWindow: '1 hour', keyGenerator: (req) => `verify-link:${req.ip}` } } }, async (request, reply) => {
    const body = z.object({ token: z.string().min(10).max(128) }).parse(request.body);

    const redisKey = `verify:email:link:${body.token}`;
    const userId = await fastify.redis.get(redisKey);
    if (!userId) {
      return fail(reply, 400, 'INVALID_TOKEN', 'Ссылка недействительна или устарела. Запросите письмо повторно.');
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true, emailVerified: true, activeRole: true, roles: true },
    });
    if (!user) {
      await fastify.redis.del(redisKey);
      return fail(reply, 404, 'NOT_FOUND', 'Пользователь не найден');
    }

    if (!user.emailVerified) {
      await fastify.prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    }
    await fastify.redis.del(redisKey);

    // Подтверждение по ссылке = вход: выдаём токены.
    const roles = user.roles.map((r) => r.role as string);
    const activeRole = (user.activeRole as string) ?? roles[0] ?? 'worker';
    const accessToken = await fastify.signAccessToken({ sub: user.id, email: user.email ?? undefined, phone: user.phone ?? undefined, roles, activeRole });
    const refreshToken = nanoidToken();
    await storeRefreshToken(fastify.redis, user.id, refreshToken);
    reply
      .setCookie('access_token', accessToken, makeCookieOpts(15 * 60))
      .setCookie('refresh_token', refreshToken, makeCookieOpts(REFRESH_TTL));

    return ok(reply, { user: { id: user.id, email: user.email, phone: user.phone, roles, activeRole } });
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
      select: {
        ...authUserWithRolesSelect,
        workerProfile: {
          select: { id: true, firstName: true, lastName: true, photoUrl: true, visibility: true },
        },
        employerProfile: {
          select: { id: true, companyName: true, contactName: true, logoUrl: true, isVerified: true },
        },
      },
    });

    if (!user || !user.passwordHash) {
      return fail(reply, 401, 'UNAUTHORIZED', 'Неверный email или пароль');
    }

    if (user.status === 'banned' || user.status === 'deleted') {
      return fail(reply, 403, 'FORBIDDEN', 'Аккаунт заблокирован');
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return fail(reply, 401, 'UNAUTHORIZED', 'Неверный email или пароль');
    }

    // Блокируем вход, пока email не подтверждён — повторно отправляем ссылку (с кулдауном).
    if (user.email && !user.emailVerified) {
      const cooldownKey = `verify:email:resend:${user.id}`;
      const onCooldown = await fastify.redis.get(cooldownKey);
      if (!onCooldown) {
        await fastify.redis.setex(cooldownKey, VERIFY_RESEND_COOLDOWN, '1');
        await sendVerificationLink(user.id, user.email);
      }
      return fail(reply, 403, 'EMAIL_NOT_VERIFIED', 'Подтвердите почту — мы отправили ссылку на ваш адрес.', { pendingUserId: user.id, email: user.email });
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
        workerProfile: user.workerProfile ?? null,
        employerProfile: user.employerProfile ?? null,
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
      return fail(reply, 401, 'UNAUTHORIZED', 'No refresh token');
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
      return fail(reply, 401, 'POSSIBLE_TOKEN_THEFT', 'Refresh token reuse detected');
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: safeUserWithRolesSelect,
    });

    if (!user) {
      return fail(reply, 401, 'UNAUTHORIZED', 'User not found');
    }

    // Ban check — invalidate session for banned/deleted accounts
    if (user.status === 'banned' || user.status === 'deleted') {
      await invalidateAllUserTokens(fastify.redis, userId).catch(() => {});
      reply
        .clearCookie('access_token', { path: '/' })
        .clearCookie('refresh_token', { path: '/' });
      return fail(reply, 401, 'ACCOUNT_BANNED', 'Account is banned');
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
      select: {
        ...safeUserSelect,
        roles: true,
        workerProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            visibility: true,
          },
        },
        employerProfile: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            logoUrl: true,
            isVerified: true,
          },
        },
      },
    });

    if (!user) {
      return fail(reply, 404, 'NOT_FOUND', 'User not found');
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

  // PATCH /active-role — switch the user's active role (re-signs access token)
  fastify.patch('/active-role', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = z.object({ role: z.enum(['worker', 'employer']) }).parse(request.body);

    const user = await fastify.prisma.user.findUnique({
      where: { id: request.jwtUser.sub },
      select: {
        id: true,
        email: true,
        phone: true,
        roles: true,
        workerProfile: { select: { id: true, firstName: true, lastName: true, photoUrl: true, visibility: true } },
        employerProfile: { select: { id: true, companyName: true, contactName: true, logoUrl: true, isVerified: true } },
      },
    });
    if (!user) {
      return fail(reply, 404, 'NOT_FOUND', 'User not found');
    }

    const roles = user.roles.map((r) => r.role as string);
    if (!roles.includes(body.role)) {
      return fail(reply, 403, 'ROLE_NOT_OWNED', 'У вас нет этой роли');
    }

    await fastify.prisma.user.update({
      where: { id: user.id },
      data: { activeRole: body.role },
    });

    const accessToken = await fastify.signAccessToken({
      sub: user.id,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      roles,
      activeRole: body.role,
    });
    reply.setCookie('access_token', accessToken, makeCookieOpts(15 * 60));

    return ok(reply, {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        roles,
        activeRole: body.role,
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
      return fail(reply, 429, 'RATE_LIMIT', 'Слишком много запросов. Повторите через 15 минут.');
    }
    const newCount = await fastify.redis.incr(rateLimitKey);
    if (newCount === 1) {
      await fastify.redis.expire(rateLimitKey, 900); // 15 minutes
    }

    // Always return 200 to not reveal whether email exists
    const successMsg = { message: 'Если email зарегистрирован, письмо придёт в течение нескольких минут' };

    const user = await fastify.prisma.user.findFirst({
      where: { email: body.email },
      select: {
        ...safeUserSelect,
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
      return fail(reply, 400, 'INVALID_OR_EXPIRED_TOKEN', 'Ссылка устарела или уже была использована');
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

  // PATCH /change-password
  fastify.patch('/change-password', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8, 'Минимум 8 символов').max(128),
      })
      .parse(request.body);

    const user = await fastify.prisma.user.findUnique({
      where: { id: request.jwtUser.sub },
      select: authUserWithRolesSelect,
    });

    if (!user?.passwordHash) {
      return fail(reply, 400, 'NO_PASSWORD', 'У аккаунта нет пароля');
    }

    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) {
      return fail(reply, 401, 'INVALID_PASSWORD', 'Неверный текущий пароль');
    }

    const passwordHash = await bcrypt.hash(body.newPassword, BCRYPT_ROUNDS);
    await fastify.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await invalidateAllUserTokens(fastify.redis, user.id);

    reply
      .clearCookie('access_token', { path: '/' })
      .clearCookie('refresh_token', { path: '/' });

    return ok(reply, { message: 'Пароль успешно изменён. Войдите снова.' });
  });
};
