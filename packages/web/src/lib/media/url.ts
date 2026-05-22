import { config } from '@/lib/config';

/** Client-side fallback when API returns a relative media path. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const base = config.mediaBaseUrl.replace(/\/$/, '');
  if (u.startsWith('/uploads/') || u.startsWith('/')) return `${config.siteUrl.replace(/\/$/, '')}${u}`;
  return `${base}/${u.replace(/^\/+/, '')}`;
}
