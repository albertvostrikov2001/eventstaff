const FALLBACK = 'http://localhost:4000/api/v1';

/**
 * Base URL for browser calls to the API. On GitHub Pages, localhost in env is unusable.
 */
export function getPublicApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
    if (!fromEnv || fromEnv.includes('localhost') || fromEnv.includes('127.0.0.1')) {
      return '';
    }
    return fromEnv;
  }
  return fromEnv && fromEnv.length > 0 ? fromEnv : FALLBACK;
}
