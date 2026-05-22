function requireApiUrlInProduction(fallback: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_URL is required in production');
  }
  return fallback;
}

const apiUrl = requireApiUrlInProduction('http://localhost:4000/api/v1');

function apiOriginFromUrl(url: string): string {
  return url.replace(/\/api\/v1\/?$/, '');
}

export const config = {
  apiUrl,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000',
  socketUrl:
    process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '') ??
    process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, '') ??
    apiOriginFromUrl(apiUrl),
  mediaBaseUrl:
    process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/$/, '') ?? apiOriginFromUrl(apiUrl),
} as const;
