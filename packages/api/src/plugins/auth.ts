import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface TokenPayload extends JWTPayload {
  sub: string;
  email?: string;
  phone?: string;
  roles: string[];
  activeRole: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      roles: string[],
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    signAccessToken: (payload: Omit<TokenPayload, 'iat' | 'exp'>) => Promise<string>;
    signRefreshToken: (userId: string) => Promise<string>;
    verifyRefreshToken: (token: string) => Promise<JWTPayload>;
  }
  interface FastifyRequest {
    jwtUser: TokenPayload;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const accessSecret = new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'change-me-to-a-random-64-char-string',
  );
  const refreshSecret = new TextEncoder().encode(
    process.env.JWT_REFRESH_SECRET ?? 'change-me-to-another-random-64-char-string',
  );
  const accessExpiry = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
  const refreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const token = request.cookies?.access_token;
        if (!token) {
          reply
            .status(401)
            .send({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
          return;
        }
        const { payload } = await jwtVerify(token, accessSecret);
        request.jwtUser = payload as TokenPayload;
      } catch {
        reply
          .status(401)
          .send({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
      }
    },
  );

  fastify.decorate('requireRole', (roles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (!request.jwtUser) {
        reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
        return;
      }
      const userRoles = request.jwtUser.roles ?? [];
      const isAdmin = userRoles.includes('admin');
      const hasRole = isAdmin || roles.some((r) => userRoles.includes(r));
      if (!hasRole) {
        reply
          .status(403)
          .send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
      }
    };
  });

  fastify.decorate(
    'signAccessToken',
    async (payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> => {
      return new SignJWT(payload as JWTPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(accessExpiry)
        .sign(accessSecret);
    },
  );

  fastify.decorate('signRefreshToken', async (userId: string): Promise<string> => {
    return new SignJWT({ sub: userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(refreshExpiry)
      .sign(refreshSecret);
  });

  fastify.decorate('verifyRefreshToken', async (token: string): Promise<JWTPayload> => {
    const { payload } = await jwtVerify(token, refreshSecret);
    return payload;
  });
};

export default fp(authPlugin, { name: 'auth' });
