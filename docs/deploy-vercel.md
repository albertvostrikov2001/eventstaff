# Деплой Next.js на Vercel (монорепозиторий pnpm + Turbo)

На Vercel выкладывается только **`packages/web`**. API (`packages/api`), Postgres и Redis должны работать **на отдельном хостинге** (VPS, Railway, Fly.io, Render и т.д.) — иначе вход в личный кабинет и API-запросы работать не будут.

Файлы в репозитории:

- `packages/web/vercel.json` — установка зависимостей из **корня** монорепы и сборка через **Turbo**
- `.node-version` — версия Node для сборки (22)

---

## 1. Команды для выгрузки на GitHub

Откройте терминал в **корне репозитория** (там, где лежат `package.json` и `pnpm-workspace.yaml`).

### PowerShell (Windows)

```powershell
cd "D:\Work Unity\EventStaff-main"

# Убедиться, что .env не попадёт в коммит (он в .gitignore)
git status

# Если репозиторий ещё не привязан:
# git remote add origin https://github.com/ВАШ_ЛОГИН/ВАШ_РЕПО.git

git add -A
git status
git commit -m "chore: конфиг Vercel для монорепозитория"
git push -u origin main
```

Если ветка не `main`, замените на свою (например `master`).

### Bash (macOS / Linux / Git Bash)

```bash
cd /path/to/EventStaff-main

git add -A
git status
git commit -m "chore: конфиг Vercel для монорепозитория"
git push -u origin main
```

### Если `git push` просит логин

- Удобнее: [GitHub CLI](https://cli.github.com/) (`gh auth login`) или SSH-ключ для `git@github.com:...`
- Либо Personal Access Token вместо пароля при HTTPS

---

## 2. Подключение проекта на Vercel

1. Зайдите на [vercel.com](https://vercel.com) → **Add New…** → **Project**
2. **Import** репозитория с GitHub
3. Обязательно укажите:
   - **Root Directory** → `packages/web` (кнопка Edit)
4. **Framework Preset**: Next.js (подтянется сам из `packages/web`)
5. **Install Command** и **Build Command** должны совпасть с `vercel.json` (проверьте, что Vercel их не перезаписал пустыми значениями)
6. **Node.js Version** в *Settings → General*: **22.x** (или опирайтесь на `.node-version` в корне репозитория, если платформа подхватывает его)

---

## 3. Переменные окружения на Vercel

В **Settings → Environment Variables** добавьте (минимум для фронта):

| Переменная | Production | Preview (по желанию) |
|------------|------------|----------------------|
| `NEXT_PUBLIC_API_URL` | `https://ваш-api.домен/api/v1` | Тот же или отдельный staging API |
| `NEXT_PUBLIC_SITE_URL` | `https://ваш-проект.vercel.app` | URL конкретного превью, если нужен стабильный CORS |

Рекомендуется также задать `NEXT_PUBLIC_WS_URL` **только если** у вас отдельный WebSocket-хост; иначе клиент берёт origin из `NEXT_PUBLIC_API_URL` (см. `getApiOriginForSocket`).

После изменения переменных сделайте **Redeploy**.

**Не кладите** в Vercel секреты базы или JWT — они нужны на **сервере API**, а не в Next.js.

---

## 4. Настройка API под Vercel

Чтобы с другого домена открывался личный кабинет (cookie + CORS):

1. На **API** в production задайте `NEXT_PUBLIC_SITE_URL` таким же публичным URL, как у сайта на Vercel (как в таблице выше, можно со слэшем на конце).
2. Включите кросс-сайтовые cookie при разных доменах API и фронта:
   - `AUTH_CROSS_SITE_COOKIES=true`  
   (или `AUTH_COOKIE_SAME_SITE=none` — см. `packages/api/src/routes/auth/index.ts`)
3. В `CORS_ORIGINS` перечислите нужные origin через запятую, если одного `NEXT_PUBLIC_SITE_URL` на API мало (например несколько превью `*.vercel.app` — тогда перечислите явные URL или заведите один preview/staging домен).

API должен быть доступен по **HTTPS**.

---

## 5. Проверка после деплоя

1. Откройте выданный Vercel URL → страница логина
2. В DevTools → Network убедитесь, что запросы идут на ваш `NEXT_PUBLIC_API_URL`, а не на `localhost`
3. Эндпоинт проверки API: `GET .../api/v1/health`

---

## 6. Частые проблемы

### Ошибка «There was a permanent problem cloning the repo» / HTTP 500 от git provider

Сообщение появляется **до** установки зависимостей и сборки: Vercel не смог склонировать репозиторий с GitHub. Это **не ошибка** в `vercel.json` или в коде проекта.

**Что сделать по порядку:**

1. **Повторить деплой** — чаще всего это временный сбой GitHub или маршрута GitHub ↔ Vercel (**Deployments → … → Redeploy**).
2. Проверить [статус GitHub](https://www.githubstatus.com/) и при необходимости подождать.
3. **Приватный репозиторий:** GitHub → **Settings → Applications → Installed GitHub Apps → Vercel** — убедиться, что приложению разрешён доступ к репозиторию `eventstaff` (или ко всем репозиториям организации).
4. **Переподключить интеграцию:** Vercel → **Settings → Git** — отвязать и снова подключить GitHub, либо удалить проект на Vercel и импортировать репозиторий заново.
5. Если ошибка **стабильно** повторяется — написать в [поддержку Vercel](https://vercel.com/help) с указанием времени деплоя и коммита: с их стороны видно точный ответ GitHub API.

Обходной путь без клонирования через GitHub App: установить [Vercel CLI](https://vercel.com/docs/cli), выполнить `vercel link` в каталоге `packages/web` и деплоить из CI или вручную (`vercel --prod`) — но для постоянной связи с репозиторием всё равно удобнее починить доступ GitHub.

| Симптом | Что проверить |
|--------|----------------|
| Сборка: workspace / `pnpm` | Root Directory = `packages/web`, в логе есть переход в корень и `pnpm install` |
| «API недоступен» | Задан `NEXT_PUBLIC_API_URL`, API запущен и доступен с интернета по HTTPS |
| Логин не держит сессию | На API: `AUTH_CROSS_SITE_COOKIES`, CORS, совпадение `NEXT_PUBLIC_SITE_URL` / `CORS_ORIGINS` |
| GitHub Pages workflow падает | Для Vercel он не обязателен; для Pages нужна переменная `NEXT_PUBLIC_API_URL` в GitHub — см. `docs/deploy-github-pages.md` |
| Клонирование: HTTP 500 | См. подраздел выше — инфраструктура GitHub/Vercel, доступ приложения к репо |
