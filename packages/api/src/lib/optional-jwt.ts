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

/**
 * Decodes the access token (from cookie or Bearer header) without throwing.
 * Returns the user id and roles, or nulls if absent/invalid. Never sends 401.
 */
export async function getOptionalAuth(
  request: FastifyRequest,
): Promise<{ userId: string | null; roles: string[] }> {
  const cookieToken = request.cookies?.access_token;
  const authHeader = request.headers?.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = cookieToken ?? headerToken;
  if (!token) return { userId: null, roles: [] };
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    const p = payload as TokenPayload;
    return { userId: p.sub ?? null, roles: p.roles ?? [] };
  } catch {
    return { userId: null, roles: [] };
  }
}

/** True if the request carries a valid admin access token. */
export async function isAdminRequest(request: FastifyRequest): Promise<boolean> {
  const { roles } = await getOptionalAuth(request);
  return roles.includes('admin');
}
