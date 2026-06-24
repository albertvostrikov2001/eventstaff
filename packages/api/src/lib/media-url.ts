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

/**
 * Detect a Prisma Decimal (decimal.js) instance using duck-typing.
 *
 * Why not instanceof: tsup bundles the API into a single file, which can
 * inline a *different* copy of the Decimal constructor than the one used
 * at runtime — making `instanceof Prisma.Decimal` unreliable. We also
 * cannot check `constructor.name` because tsup minifies it to a single
 * letter.  Instead we check for the three methods that every decimal.js
 * instance reliably exposes AND that plain JS numbers/strings/objects do
 * NOT have, plus verify the result of toJSON() is a finite numeric string.
 */
function isDecimalLike(value: unknown): value is { toNumber(): number } {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v['toNumber'] !== 'function') return false;
  if (typeof v['toFixed'] !== 'function') return false;
  if (typeof v['toJSON'] !== 'function') return false;
  // Final guard: toJSON() of a decimal produces a numeric string like "4.95"
  try {
    const json = (v['toJSON'] as () => unknown)();
    return typeof json === 'string' && json.length > 0 && isFinite(Number(json));
  } catch {
    return false;
  }
}

/** Safely convert any Decimal-like value to a plain JS number, or null if absent. */
export function safeNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (isDecimalLike(value)) return value.toNumber();
  const n = Number(value);
  return isNaN(n) ? null : n;
}

/** Recursively normalize API payloads: convert Prisma Decimals → numbers and
 *  rewrite known media URL fields to absolute public URLs. Called by every
 *  replyOk / replyPaginated so this is the single systemic fix point. */
export function normalizeMediaFieldsDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;
  // --- Prisma Decimal → number (must be before Array/object checks) ---
  if (isDecimalLike(value)) return value.toNumber() as unknown as T;
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
