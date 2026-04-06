# Локальный запуск: Docker + фронт (Windows)

Подробная инструкция после того, как вы **уже установили и запустили Docker Desktop**.

---

## Шаг 1. Убедиться, что Docker реально готов

1. Откройте **Docker Desktop** и дождитесь статуса **Running** (зелёный индикатор), без надписи «Starting…».
2. Откройте **PowerShell** или **Терминал** в Cursor.
3. Выполните:
   ```powershell
   docker version
   ```
   Должны быть и **Client**, и **Server**. Если Server с ошибкой — в Docker Desktop: **Troubleshoot → Restart Docker Desktop** и подождите минуту.

**Если при `docker compose up` видите `500 Internal Server Error` при загрузке образов** — это сбой движка Docker на Windows. Обычно помогает: полный выход из Docker Desktop → запуск снова, либо **Restart** из Troubleshoot, затем повторить команду через 1–2 минуты.

---

## Шаг 2. Запустить базу, Redis и API одной командой

1. Перейдите в **корень проекта** (папка `EventStaff-main`, где лежит `docker-compose.yml`):
   ```powershell
   cd "d:\Work Unity\EventStaff-main"
   ```
2. Запуск:
   ```powershell
   docker compose up -d --build
   ```
   Первый раз сборка **API** может занять **несколько минут** (скачивание базовых образов + сборка Node).

**Автоматический сценарий (опционально):**

```powershell
.\scripts\start-docker-stack.ps1
```

Скрипт поднимает compose, ждёт health API и спрашивает, нужно ли выполнить **seed**.

---

## Шаг 3. Проверить, что API живой

В браузере откройте:

- [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health) — должен быть JSON со статусами `database` и `redis`.
- [http://localhost:4000/docs](http://localhost:4000/docs) — Swagger.

Или в PowerShell:

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/v1/health" -UseBasicParsing
```

---

## Шаг 4. (Обычно нужно один раз) Тестовые пользователи в базе

Если вы **ещё не** запускали seed:

```powershell
docker compose exec api sh -c "cd /app && pnpm --filter @unity/api exec prisma db seed"
```

В консоли появится список email и паролей (admin, работодатели, сотрудники).

---

## Шаг 5. Настроить фронт (Next.js), чтобы логин работал

API в контейнере подписывает JWT секретом из `docker-compose.yml`. **Тот же** секрет должен знать **Next.js middleware** на вашей машине.

1. Скопируйте пример окружения:
   - Файл: `packages\web\env.docker.local.example`
   - Сохраните как: `packages\web\.env.local`  
   В PowerShell из корня репозитория:
   ```powershell
   Copy-Item "packages\web\env.docker.local.example" "packages\web\.env.local"
   ```
2. При необходимости откройте `.env.local` и проверьте строки (они уже совпадают с `docker-compose` для сервиса `api`):
   - `JWT_SECRET=local-docker-change-me-to-random-string`
   - `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`

**Важно:** сайт открывайте как **http://localhost:3000**, а не `127.0.0.1`, если в `NEXT_PUBLIC_SITE_URL` указан `localhost` — так проще с куками и CORS.

---

## Шаг 6. Запустить фронт

Из **корня** репозитория:

```powershell
pnpm install
pnpm dev
```

Откройте [http://localhost:3000/auth/login](http://localhost:3000/auth/login) и войдите тестовой учёткой из вывода seed (например сотрудник `anna.smirnova@test.ru` / `Worker1234!`).

---

## Что уже крутится в Docker (порты)

| Сервис    | Порт  | Назначение        |
|-----------|-------|-------------------|
| API       | 4000  | REST + куки логина |
| PostgreSQL | 5432 | База              |
| Redis     | 6379  | Сессии refresh    |
| Adminer   | 8080  | Веб-UI к БД       |

---

## Полезные команды

```powershell
docker compose ps
docker compose logs api --tail 100
docker compose down
```

---

## GitHub Pages и этот Docker

Статический сайт на `github.io` **не может** ходить на `localhost:4000` на вашем ПК. Для входа с GitHub Pages нужен **публичный HTTPS API** и переменная `NEXT_PUBLIC_API_URL` в настройках Actions (это описано в других сообщениях в чате / в workflow деплоя).

Локальный Docker нужен для разработки и проверки логина на **localhost:3000**.
