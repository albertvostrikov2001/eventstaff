# Деплой фронта на GitHub Pages и вход в личный кабинет

GitHub Pages отдаёт только **статический** Next.js (сборка `STATIC_EXPORT`). **API и база** должны работать на отдельном сервере (VPS, Railway, Fly.io, Render и т.п.).

## 1. Поднять API в интернете

1. Создайте PostgreSQL и Redis у провайдера (или один VPS с Docker).
2. Образ API собирается в CI: workflow **Publish API Docker image** пушит в GHCR:
   `ghcr.io/<ваш-логин>/eventstaff-api:latest`
3. Запустите контейнер с переменными (минимум):

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | Строка подключения Postgres |
| `REDIS_URL` | Строка подключения Redis |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Длинные случайные строки |
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_SITE_URL` | Точный публичный URL сайта на Pages, **с завершающим слэшем**, например `https://albertvostrikov2001.github.io/eventstaff/` |
| `AUTH_CROSS_SITE_COOKIES` | `true` (или `AUTH_COOKIE_SAME_SITE=none`) — иначе браузер не отправит cookie с `github.io` на другой домен API |

При необходимости добавьте `CORS_ORIGINS` со значением `https://albertvostrikov2001.github.io` (обычно хватает `NEXT_PUBLIC_SITE_URL` — из него берётся origin).

4. Прокси / TLS: API должен быть доступен по **HTTPS** (для `Secure` cookies в production).
5. Публичный адрес API вида `https://api.ваш-домен.ru` — запомните его для шага 2.

## 2. Настроить репозиторий на GitHub

1. **Settings → Secrets and variables → Actions → Variables**
   - `NEXT_PUBLIC_API_URL` = `https://ваш-api-хост/api/v1` (как в локальном `.env.example`, с суффиксом `/api/v1`).

2. **Settings → Pages**
   - Source: **GitHub Actions** (не «Deploy from branch»).

3. Запушьте в ветку `main` — отработает workflow **Deploy to GitHub Pages**.

Если `NEXT_PUBLIC_API_URL` ещё не задан, деплой **всё равно выполнится** (в логе будет предупреждение). Без этой переменной фронт не знает адрес API — **вход в личный кабинет не заработает**, пока не добавите переменную и не пересоберёте (повторный push или **Re-run workflow**).

Сайт откроется по адресу:

`https://<owner>.github.io/<имя-репозитория>/`

(для репозитория `eventstaff` путь будет `/eventstaff/`.)

## 3. Проверка входа

- Откройте **именно** URL Pages (тот же host/path, что в `NEXT_PUBLIC_SITE_URL` на API).
- Страница входа: `.../auth/login/`.
- Если снова «API недоступен» — проверьте, что переменная `NEXT_PUBLIC_API_URL` задана **до** последней сборки Pages и что API отвечает по HTTPS с `/api/v1/health`.

## 4. Ограничения статического экспорта

- В CI временно отключается `middleware.ts` (переименование в `.bak`) — см. `.github/workflows/deploy.yml`.
- Часть функций может требовать полноценного Node-сервера Next.js; для продакшена с полным функционалом рассмотрите Vercel/свой VPS для фронта.
