/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === 'true';

function getBasePath() {
  if (!isStaticExport) return undefined;
  const raw = process.env.NEXT_PUBLIC_BASE_PATH || '';
  if (!raw) return undefined;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

const basePath = getBasePath();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@unity/shared'],
  ...(isStaticExport
    ? {
        output: 'export',
        trailingSlash: true,
        images: {
          unoptimized: true,
          dangerouslyAllowSVG: true,
          contentDispositionType: 'attachment',
          contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
        },
      }
    : {
        images: {
          formats: ['image/avif', 'image/webp'],
          dangerouslyAllowSVG: true,
          contentDispositionType: 'attachment',
          contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
          remotePatterns: [
            {
              protocol: 'https',
              hostname: 'storage.yandexcloud.net',
            },
          ],
        },
      }),
  ...(basePath ? { basePath } : {}),
  ...(!isStaticExport
    ? {
        async headers() {
          return [
            {
              source: '/(.*)',
              headers: [
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
              ],
            },
          ];
        },
      }
    : {}),
};

module.exports = nextConfig;
