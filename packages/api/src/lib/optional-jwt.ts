import { jwtVerify } from 'jose';
import type { FastifyRequest } from 'fastify';
import type { TokenPayload } from '@/plugins/auth';

const accessSecret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'change-me-to-a-random-64-char-string',
);

/**
 * Returns user id if a valid access cookie is present; otherwise null (no 401).
 */
export async function getOptionalUserId(request: FastifyRequest): Promise<string | null> {
  const token = request.cookies?.access_token;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    return (payload as TokenPayload).sub;
  } catch {
    return null;
  }
}
