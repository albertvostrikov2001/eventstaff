export function publicSiteUrl(): string {
  const raw =
    process.env.PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'http://localhost:3000';
  return raw.replace(/\/$/, '');
}
