/** True when CI builds static export for GitHub Pages (`STATIC_EXPORT=true`). */
export const IS_STATIC_EXPORT = process.env.STATIC_EXPORT === 'true';

/** SSR on VPS; static placeholders on GitHub Pages. */
export const PAGE_DYNAMIC = IS_STATIC_EXPORT ? ('auto' as const) : ('force-dynamic' as const);

/** Placeholder params for static export; empty on server deployments. */
export function buildStaticParams<T extends Record<string, string>>(placeholders: T[]): T[] {
  return IS_STATIC_EXPORT ? placeholders : [];
}
