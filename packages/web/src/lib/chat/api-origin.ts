import { getPublicApiBase } from '@/lib/api/publicApiBase';

/**
 * Base URL of the API host (for Socket.io), e.g. http://localhost:4000
 */
export function getApiOriginForSocket(): string {
  const b = getPublicApiBase();
  if (!b) return '';
  return b.replace(/\/api\/v1\/?$/, '');
}
