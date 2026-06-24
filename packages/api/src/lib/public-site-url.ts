/**
 * Single source of truth for the public site URL.
 * Priority: SITE_URL → PUBLIC_SITE_URL → NEXT_PUBLIC_SITE_URL
 * In production (NODE_ENV=production) a missing URL is logged as a warning;
 * localhost fallback is ONLY used in development.
 */
export function publicSiteUrl(): string {
  const raw =
    process.env.SITE_URL?.trim() ||
    process.env.PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (raw) return raw.replace(/\/$/, '');

  if (process.env.NODE_ENV === 'production') {
    // Log once so ops can spot this in PM2 logs.
    console.warn(
      '[Unity] WARNING: SITE_URL / PUBLIC_SITE_URL is not set in production. ' +
      'Set SITE_URL=https://yourdomain.ru in /opt/unity/.env to fix media URLs, ' +
      'payment return URLs and email links.',
    );
  }
  return 'http://localhost:3000';
}

/** Convenience: build an absolute path on the site. */
export function siteUrl(path = ''): string {
  return `${publicSiteUrl()}${path}`;
}
