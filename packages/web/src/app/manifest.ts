import type { MetadataRoute } from 'next';

/** /manifest.webmanifest — базовые PWA-сигналы для мобильного SEO. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Юнити — Платформа event-персонала',
    short_name: 'Юнити',
    description:
      'Подбор официантов, барменов и event-персонала для мероприятий, ресторанов и кейтеринга.',
    start_url: '/',
    display: 'standalone',
    background_color: '#08120e',
    theme_color: '#08120e',
    lang: 'ru-RU',
    icons: [
      { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
    ],
  };
}
