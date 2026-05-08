/**
 * URLs under `public/` for GitHub Pages and other subpath deployments.
 * `basePath` applies to `_next/` and `Link`, but `next/image` with `src="/file.png"`
 * can stay root-relative; this prefixes `NEXT_PUBLIC_BASE_PATH` when set.
 */
export function publicAssetUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
