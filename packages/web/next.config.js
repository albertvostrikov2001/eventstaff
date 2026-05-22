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
            { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
            { protocol: 'https', hostname: 'api.dicebear.com', pathname: '/**' },
            { protocol: 'http', hostname: 'localhost', pathname: '/**' },
            { protocol: 'http', hostname: '127.0.0.1', pathname: '/**' },
            { protocol: 'http', hostname: '147.45.235.70', pathname: '/**' },
            { protocol: 'https', hostname: '147.45.235.70', pathname: '/**' },
          ],
        },
      }),
  ...(basePath ? { basePath } : {}),
  ...(!isStaticExport
    ? {
        async redirects() {
          return [
            {
              source: '/messages/:path*',
              destination: '/worker/messages/:path*',
              permanent: false,
            },
          ];
        },
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
