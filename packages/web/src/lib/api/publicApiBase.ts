const FALLBACK = 'http://localhost:4000/api/v1';

/**
 * В dev, если фронт открыт с 127.0.0.1, а в env — localhost (или наоборот),
 * запросы к «другому» хосту для cookie и отладки неудобны. Подставляем хост страницы.
 */
function devLocalBaseFromWindow(): string | null {
  if (typeof window === 'undefined') return null;
  if (process.env.NODE_ENV !== 'development') return null;
  const h = window.location.hostname;
  if (h !== 'localhost' && h !== '127.0.0.1') return null;
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  const raw = fromEnv && fromEnv.length > 0 ? fromEnv : FALLBACK;
  try {
    const u = new URL(raw);
    if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return null;
    const port = u.port || '4000';
    const path = u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : '/api/v1';
    return `http://${h}:${port}${path.startsWith('/') ? path : `/${path}`}`;
  } catch {
    return `http://${h}:4000/api/v1`;
  }
}

/**
 * Base URL for browser calls to the API. On GitHub Pages, localhost in env is unusable.
 */
export function getPublicApiBase(): string {
  const fromWindow = devLocalBaseFromWindow();
  if (fromWindow) return fromWindow;

  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
    if (!fromEnv || fromEnv.includes('localhost') || fromEnv.includes('127.0.0.1')) {
      return '';
    }
    return fromEnv;
  }
  return fromEnv && fromEnv.length > 0 ? fromEnv : FALLBACK;
}

/** Сообщение, если fetch упал (сеть / API не слушает порт) */
export const API_UNREACHABLE_HINT =
  'API недоступен (http://…:4000). Запустите Docker Desktop → pnpm docker:db (только БД) или pnpm docker:up, затем pnpm dev:all. Если порт 3000 занят — остановите лишний Next или поднимите только API: pnpm --filter @unity/api dev. Хост сайта должен совпадать с NEXT_PUBLIC_API_URL (localhost ≠ 127.0.0.1).';
