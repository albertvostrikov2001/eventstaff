import { publicSiteUrl } from '@/lib/public-site-url';

const MEDIA_FIELD_NAMES = new Set([
  'photoUrl',
  'logoUrl',
  'avatarUrl',
  'videoUrl',
  'url',
  'imageUrl',
  'thumbnailUrl',
]);

export function uploadsPublicBase(): string {
  const raw = process.env.PUBLIC_UPLOADS_BASE_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return `${publicSiteUrl()}/uploads`;
}

/** Normalize relative or partial media paths to absolute public URLs. */
export function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (url == null || url === '') return null;
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/uploads/')) return `${publicSiteUrl()}${u}`;
  if (u.startsWith('/')) return `${publicSiteUrl()}${u}`;
  return `${uploadsPublicBase()}/${u.replace(/^\/+/, '')}`;
}

/** Recursively normalize known media URL fields in API payloads. */
export function normalizeMediaFieldsDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => normalizeMediaFieldsDeep(item)) as T;
  }
  if (typeof value === 'object') {
    if (value instanceof Date) return value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (MEDIA_FIELD_NAMES.has(k) && typeof v === 'string') {
        out[k] = normalizeMediaUrl(v);
      } else {
        out[k] = normalizeMediaFieldsDeep(v);
      }
    }
    return out as T;
  }
  return value;
}
