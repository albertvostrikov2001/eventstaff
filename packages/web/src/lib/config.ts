function resolveApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const isStaticExport =
    process.env.STATIC_EXPORT === 'true' ||
    process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';

  // Browser / GitHub Pages: never throw — publicApiBase handles github.io.
  if (typeof window !== 'undefined' || isStaticExport) {
    return 'http://localhost:4000/api/v1';
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_URL is required in production');
  }

  return 'http://localhost:4000/api/v1';
}

function apiOriginFromUrl(url: string): string {
  return url.replace(/\/api\/v1\/?$/, '');
}

const apiUrl = resolveApiUrl();

const defaultSiteUrl =
  process.env.NEXT_PUBLIC_BASE_PATH && process.env.NEXT_PUBLIC_BASE_PATH !== '/'
    ? `https://albertvostrikov2001.github.io${process.env.NEXT_PUBLIC_BASE_PATH}`
    : 'http://localhost:3000';

export const config = {
  apiUrl,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? defaultSiteUrl,
  socketUrl:
    process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '') ??
    process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, '') ??
    apiOriginFromUrl(apiUrl),
  mediaBaseUrl:
    process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/$/, '') ?? apiOriginFromUrl(apiUrl),
} as const;
