# CLAUDE.md — Unity Platform

Полная техническая документация проекта для Claude Code.
Обновлено: 29.05.2026

---

## 1. ОБЗОР ПРОЕКТА

**Юнити** — специализированная платформа для подбора event-персонала (официанты, бармены, повара, хостес, кальянщики и др.) в ресторанном бизнесе и сфере гостеприимства.

**Production:** `http://147.45.235.70`
**Монорепо:** pnpm workspaces + Turborepo

### Три роли пользователей:
- **Worker (работник)** — создаёт анкету, откликается на вакансии, получает приглашения
- **Employer (работодатель)** — публикует вакансии, ищет работников, управляет сменами
- **Admin** — модерирует контент, управляет пользователями, обрабатывает заявки

---

## 2. ТЕХНИЧЕСКИЙ СТЕК

### Backend (`packages/api`)
- **Fastify 5** — HTTP-сервер (порт 4000)
- **Prisma 6** — ORM + PostgreSQL
- **Redis** — хранение refresh tokens, rate limiting, очереди
- **Socket.IO** — realtime чат
- **tsup** — сборка в единый `dist/server.js`
- **BullMQ** — очередь email-уведомлений
- **PM2** — process manager на сервере

### Frontend (`packages/web`)
- **Next.js 14 App Router** — SSR/SSG + Client Components
- **Zustand** — auth store (`useAuthStore`)
- **React Hook Form + Zod** — формы
- **Tailwind CSS** + кастомные дизайн-токены
- **Lucide React** — иконки

### Shared (`packages/shared`)
- `STAFF_CATEGORIES`, `BUSINESS_TYPES`, `APPLICATION_STATUSES` — общие константы
- Zod-схемы для форм
- Общие TypeScript типы

---

## 3. СТРУКТУРА ПРОЕКТА

```
EventStaff-main/
├── packages/
│   ├── api/
│   │   ├── src/
│   │   │   ├── server.ts              # Entry point Fastify
│   │   │   ├── routes/
│   │   │   │   ├── auth/index.ts      # /api/v1/auth/*
│   │   │   │   ├── worker/index.ts    # /api/v1/worker/*
│   │   │   │   ├── employer/index.ts  # /api/v1/employer/*
│   │   │   │   ├── catalog/index.ts   # /api/v1/catalog/*
│   │   │   │   ├── admin/index.ts     # /api/v1/admin/*
│   │   │   │   ├── chat/index.ts      # /api/v1/chat/*
│   │   │   │   ├── payments/index.ts  # /api/v1/payments/*
│   │   │   │   ├── subscriptions/index.ts
│   │   │   │   ├── notifications/index.ts
│   │   │   │   ├── shifts/index.ts
│   │   │   │   └── media/index.ts
│   │   │   ├── lib/
│   │   │   │   ├── api-reply.ts       # replyOk, replyFail, replyPaginated
│   │   │   │   ├── media-url.ts       # normalizeMediaFieldsDeep (Decimal fix!)
│   │   │   │   ├── public-site-url.ts # publicSiteUrl()
│   │   │   │   ├── jwt-access.ts
│   │   │   │   └── restriction.ts
│   │   │   ├── plugins/
│   │   │   │   ├── auth.ts            # JWT middleware
│   │   │   │   ├── prisma.ts
│   │   │   │   └── notifications.ts
│   │   │   ├── services/
│   │   │   │   ├── subscription-service.ts
│   │   │   │   ├── reliability-service.ts
│   │   │   │   └── email-service.ts
│   │   │   ├── payment/
│   │   │   │   └── yookassa-adapter.ts
│   │   │   └── socket/
│   │   │       └── chat-socket.ts
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       ├── seed.ts
│   │       └── scripts/
│   │           ├── approve-existing-photos.sql
│   │           └── pre-launch-cleanup.sql  # Очистка тест-данных перед запуском
│   ├── web/
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (admin)/admin/     # Admin кабинет
│   │       │   ├── (auth)/auth/       # login, register, forgot-password
│   │       │   ├── (employer)/employer/ # Employer кабинет
│   │       │   ├── (worker)/worker/   # Worker кабинет
│   │       │   └── (public)/          # Публичный сайт
│   │       ├── components/
│   │       │   ├── catalog/           # WorkerCard, EmployerCard
│   │       │   ├── forms/             # VacancyForm, FormField
│   │       │   ├── layout/            # Header, Footer, DashboardShells
│   │       │   └── ui/                # Button, Toast, etc.
│   │       ├── stores/
│   │       │   └── authStore.ts       # Zustand auth state
│   │       ├── lib/
│   │       │   ├── api/client.ts      # apiClient
│   │       │   └── config.ts          # config.apiUrl, config.siteUrl
│   │       └── providers/
│   │           └── AuthProvider.tsx   # initAuth() при mount
│   └── shared/
│       └── src/
│           ├── constants.ts           # STAFF_CATEGORIES, BUSINESS_TYPES
│           ├── schemas.ts             # Zod schemas
│           └── types.ts
├── deploy.py                          # Безопасный деплой через env vars
├── deploy_audit_fixes.py              # Деплой audit-исправлений
├── DEPLOY_NOTES.md                    # Инструкции по production-запуску
└── CLAUDE.md                          # Этот файл
```

---

## 4. PRISMA МОДЕЛИ (ключевые)

| Модель | Назначение |
|---|---|
| `User` | Аккаунт, роли, статус (active/banned/restricted) |
| `WorkerProfile` | Анкета работника: имя, рейтинг, ставка, специализации |
| `EmployerProfile` | Профиль работодателя: компания, верификация |
| `Vacancy` | Вакансия с rate (Decimal!), category, status |
| `Application` | Отклик worker→vacancy, статус (pending/confirmed/rejected) |
| `Booking` | Подтверждённая договорённость employer↔worker |
| `Shift` | Смена (PENDING→ACTIVE→COMPLETED/FAILED/DISPUTED) |
| `ShiftPayment` | Оплата смены через YooKassa |
| `ChatRoom` | Чат-комната (связана с Application или Shift) |
| `ChatMessage` | Сообщение в чате |
| `Subscription` | Подписка работодателя (free/basic/pro/enterprise) |
| `WorkerSubscription` | Подписка работника (free/premium) |
| `InAppNotification` | Уведомления в кабинете |
| `UserReliabilityScore` | Рейтинг надёжности (score<40 → isRestricted) |
| `IndividualRequest` | Персональный запрос на подбор персонала |
| `Media` | Загруженные файлы (avatar, portfolio), статус модерации |
| `AdminAuditLog` | Лог действий администратора |

### ⚠️ Критично — Decimal поля:
```
WorkerProfile.desiredRate   Decimal? @db.Decimal(10,2)
WorkerProfile.ratingScore   Decimal? @db.Decimal(3,2)
EmployerProfile.ratingScore Decimal? @db.Decimal(3,2)
EmployerProfile.responseRate Decimal @db.Decimal(5,2)
Vacancy.rate                Decimal  @db.Decimal(10,2)
Booking.rate                Decimal? @db.Decimal(10,2)
```

---

## 5. ⚠️ КРИТИЧЕСКИЙ ПАТТЕРН — DECIMAL СЕРИАЛИЗАЦИЯ

### Проблема:
Prisma Decimal НЕ сериализуется автоматически в JSON как число. При bundling через tsup `instanceof Prisma.Decimal` ненадёжен (разные копии конструктора). При spread `{...prismaModel}` Proxy конвертирует Decimal → string через `.toJSON()`.

### Решение:

**Глобальный фикс** (в `packages/api/src/lib/media-url.ts`):
```ts
function isDecimalLike(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v['toNumber'] !== 'function') return false;
  if (typeof v['toFixed'] !== 'function') return false;
  if (typeof v['toJSON'] !== 'function') return false;
  try {
    const json = (v['toJSON'] as () => unknown)();
    return typeof json === 'string' && json.length > 0 && isFinite(Number(json));
  } catch { return false; }
}
// Вызывается в normalizeMediaFieldsDeep() → которая вызывается из replyOk/replyPaginated
```

**Явный фикс для spread-объектов** (обязателен когда делаешь `{...w, ...}`):
```ts
// ПРАВИЛЬНО:
return {
  ...w,
  desiredRate: w.desiredRate != null ? parseFloat(w.desiredRate.toString()) : null,
  ratingScore: w.ratingScore != null ? parseFloat(w.ratingScore.toString()) : null,
  rate: w.rate != null ? parseFloat(w.rate.toString()) : null,
};

// НЕПРАВИЛЬНО (вернёт строку "4.95" вместо числа 4.95):
return { ...w };
```

**Правило:** Если возвращаешь прямой Prisma-результат (без spread) — `normalizeMediaFieldsDeep` обработает автоматически. Если делаешь spread — конвертируй Decimal явно.

---

## 6. AUTH STORE И FLOW

### `packages/web/src/stores/authStore.ts`
```ts
interface AuthUser {
  id: string;
  email?: string | null;
  roles: RoleKey[];
  activeRole: RoleKey;
  workerProfile?: { id, firstName, lastName, photoUrl, visibility } | null;
  employerProfile?: { id, companyName, contactName, logoUrl, isVerified } | null;
}
// initAuth() → fetch('/auth/me') → setUser()
// Вызывается в AuthProvider.tsx при mount
```

### ⚠️ Auth flow bug (ИСПРАВЛЕН):
**Проблема была:** `/auth/login` возвращал `{id, email, roles}` без профиля → `setUser()` ставил `isInitialized=true` → layout guard рендерил dashboard с пустым профилем → "Специалист!" вместо имени.

**Исправление:** `/auth/login` теперь включает `workerProfile` и `employerProfile` из DB.

### Role guards:
- `(worker)/layout.tsx` → `RoleLayoutGuard allowedRole="worker"` → редирект если не worker
- `(employer)/layout.tsx` → `RoleLayoutGuard allowedRole="employer"`
- `(admin)/layout.tsx` → `RoleLayoutGuard allowedRole="admin"`
- Пока `isInitialized=false` → показывает spinner

---

## 7. API СТРУКТУРА

### Base URL: `http://147.45.235.70/api/v1`

```
GET  /health                            → {status, db, redis}

POST /auth/login                        → {user: {+workerProfile, +employerProfile}}
POST /auth/register
POST /auth/logout
POST /auth/refresh
GET  /auth/me                           → {user: полный профиль из DB}

GET  /catalog/workers?limit&page&...    → список работников
GET  /catalog/workers/:id               → профиль работника
GET  /catalog/employers                 → список работодателей
GET  /catalog/employers/:slug           → профиль работодателя
GET  /catalog/vacancies                 → список вакансий
GET  /catalog/vacancies/:id             → детали вакансии
GET  /catalog/cities                    → [{id, name}]

GET/PATCH /worker/profile               → профиль работника
GET  /worker/applications               → отклики работника
POST /worker/applications               → подать отклик
GET  /worker/shifts                     → смены работника
GET  /worker/invitations                → приглашения
GET  /worker/dashboard/summary          → статистика дашборда
GET  /worker/calendar                   → доступность
GET  /worker/subscription               → текущий план
POST /worker/boost                      → буст анкеты

GET  /employer/profile                  → профиль работодателя
GET  /employer/vacancies                → вакансии работодателя
POST /employer/vacancies                → создать вакансию
GET  /employer/applications             → все отклики
PATCH /employer/applications/:id/status → подтвердить/отклонить
GET  /employer/search                   → поиск работников
GET  /employer/favorites/workers        → избранные работники
GET  /employer/shifts                   → смены работодателя
GET  /employer/dashboard/summary
POST /employer/individual-requests      → персональный запрос

GET  /notifications                     → уведомления (общий)
GET  /notifications/unread-count

GET  /chat/rooms                        → список чатов
GET  /chat/rooms/:id/messages           → сообщения
POST /chat/rooms/:id/messages           → отправить

GET  /admin/users
GET  /admin/vacancies
GET  /admin/applications
GET  /admin/subscriptions
GET  /admin/media/pending               → на модерации
PATCH /admin/media/:id/approve
PATCH /admin/media/:id/reject
GET  /admin/individual-requests
POST /admin/messages                    → написать пользователю
GET  /admin/complaints
GET  /admin/shifts/disputed
GET  /admin/contact-requests
GET  /admin/email-logs
GET  /admin/audit-log

POST /payments/create                   → оплата смены (YooKassa)
POST /payments/webhook                  → YooKassa webhook
POST /subscriptions/create              → подписка работодателя
POST /worker/subscription/create        → подписка работника

GET  /reliability/me                    → {isRestricted, score}
GET  /user/review-usage                 → {used, limit, unlimited}
```

---

## 8. FRONTEND МАРШРУТЫ

### Публичные `(public)`:
```
/                           Главная
/vacancies                  Каталог вакансий
/vacancies/[id]             Детали вакансии (клиент)
/workers                    Каталог работников
/workers/[id]               Профиль работника (SSG + generateMetadata)
/employers                  Каталог работодателей
/employers/[slug]           Профиль работодателя (SSG + generateMetadata)
/pricing                    Тарифы
/how-it-works               Как работает
/about                      О сервисе
/contacts                   Контакты (форма)
/request                    Персональный подбор
/help                       Центр помощи
/legal/terms, /privacy, /offer
/payment/return             Возврат после оплаты
```

### Авторизация `(auth)`:
```
/auth/login
/auth/register
/auth/forgot-password
/auth/reset-password
/auth/verify-email
```

### Worker `(worker)/worker/`:
```
/worker/dashboard           Дашборд (greeting, stats, recent apps)
/worker/profile             Редактирование профиля
/worker/profile/media       Загрузка фото/портфолио
/worker/shifts              Мои смены (active/completed/cancelled)
/worker/invitations         Приглашения от работодателей
/worker/applications        Мои отклики с фильтрами
/worker/favorites           Избранные вакансии
/worker/messages            Чат-список
/worker/messages/[id]       Конкретный чат
/worker/calendar            Календарь доступности
/worker/reviews             Отзывы смен
/worker/subscription        Управление Premium-подпиской
/worker/notifications       Уведомления
/worker/settings            Настройки аккаунта
/worker/settings/notifications Email-рассылка
```

### Employer `(employer)/employer/`:
```
/employer/dashboard         Дашборд
/employer/profile           Профиль компании
/employer/profile/media     Логотип и медиа
/employer/vacancies         Мои вакансии
/employer/vacancies/new     Создать вакансию
/employer/vacancies/[id]    Детали вакансии
/employer/vacancies/[id]/edit
/employer/vacancies/[id]/applications
/employer/applications      Все отклики по всем вакансиям
/employer/search            Поиск работников (каталог с фильтрами)
/employer/invitations       Исходящие приглашения
/employer/favorites         Избранные работники
/employer/messages          Чат-список
/employer/messages/[roomId]
/employer/shifts            Управление сменами
/employer/analytics         Аналитика (требует план Бизнес+)
/employer/subscription      Подписка
/employer/templates         Шаблоны вакансий
/employer/notifications     Уведомления
/employer/settings          Настройки
```

### Admin `(admin)/admin/`:
```
/admin/dashboard            Панель (stats tiles)
/admin/users                Список пользователей
/admin/vacancies            Все вакансии
/admin/applications         Все отклики
/admin/complaints           Жалобы
/admin/shifts/disputed      Спорные смены
/admin/email-logs           Лог email-уведомлений
/admin/individual-requests  Персональные заявки
/admin/individual-requests/[id]
/admin/messages             Чат поддержки
/admin/contact-requests     Обращения с сайта
/admin/subscriptions        Подписки пользователей
/admin/audit-log            Журнал действий
/admin/media/pending        Модерация медиа (НЕ /admin/media!)
```

---

## 9. КЛЮЧЕВЫЕ КОМПОНЕНТЫ

### `replyOk` / `replyPaginated` — всегда вызывают `normalizeMediaFieldsDeep()`:
```ts
// packages/api/src/lib/api-reply.ts
export function replyOk(reply, data, statusCode = 200) {
  return reply.status(statusCode).send({ success: true, data: normalizeMediaFieldsDeep(data) });
}
export function replyPaginated(reply, data, meta, statusCode = 200) {
  return reply.status(statusCode).send({ success: true, data: normalizeMediaFieldsDeep(data), meta });
}
```

### `normalizeMediaFieldsDeep()` — Decimal→number + media URL normalization:
```ts
// packages/api/src/lib/media-url.ts
// 1. Конвертирует Prisma Decimal → number (duck-typing, без instanceof)
// 2. Нормализует media URL поля (photoUrl, logoUrl, etc.) → абсолютные URL
// Вызывается автоматически для каждого ответа API
```

### `RestrictionBanner` — баннер ограниченного аккаунта:
```ts
// packages/web/src/components/layout/RestrictionBanner.tsx
// Показывает если: score < 40 || strikeCount >= 3
// API: GET /reliability/me → {isRestricted, restrictedReason}
```

### `RoleLayoutGuard`:
```ts
// packages/web/src/components/layout/RoleLayoutGuard.tsx
// Пока isInitialized=false → spinner
// Если не та роль → redirect к нужному dashboard
```

---

## 10. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ

### API (`packages/api` / корневой `.env`):
```env
# БД
DATABASE_URL="postgresql://unity:password@localhost:5432/unity_db"
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."

# Site URL (важно для canonical, email-ссылок, payment return)
SITE_URL="http://147.45.235.70"           # ← НА ПРОДЕ ДОЛЖЕН БЫТЬ ЗАПОЛНЕН!
PUBLIC_SITE_URL="http://147.45.235.70"

# Медиа
UPLOADS_ROOT="/opt/unity/packages/api/uploads"
PUBLIC_UPLOADS_BASE_URL="http://147.45.235.70/uploads"

# Платежи (НА ПРОДЕ ПУСТЫ — платежи недоступны)
YOOKASSA_SHOP_ID=""
YOOKASSA_SECRET_KEY=""
YOOKASSA_WEBHOOK_SECRET=""
PAYMENT_RETURN_URL="http://147.45.235.70/payment/return"

# Email
SMTP_HOST="smtp.example.ru"
SMTP_USER="noreply@unity-staff.ru"
SMTP_PASS="..."
EMAIL_FROM="noreply@unity-staff.ru"

# CORS
CORS_ORIGINS="http://147.45.235.70"
```

### Web (`packages/web/.env.production`):
```env
NEXT_PUBLIC_API_URL="http://147.45.235.70/api/v1"
NEXT_PUBLIC_WS_URL="http://147.45.235.70"
NEXT_PUBLIC_SITE_URL="http://147.45.235.70"
```

---

## 11. ДЕПЛОЙ

### Команды на сервере:
```bash
# API only (быстро, ~30 сек):
cd /opt/unity
pnpm --filter @unity/api run build 2>&1
pm2 restart unity-api

# Web (медленно, ~2-3 мин):
pnpm --filter @unity/web run build 2>&1
pm2 restart unity-web

# Синхронизация /opt/app → /opt/unity перед сборкой:
rsync -a --checksum /opt/app/packages/ /opt/unity/packages/
```

### Python deploy script (`deploy.py`):
```bash
# Credentials через env или .env.deploy (не в git):
export DEPLOY_PASS=your-password
# ИЛИ:
export DEPLOY_KEY_PATH=~/.ssh/id_unity_prod

python deploy.py
```

### Серверные пути:
```
/opt/app/           ← загружается через SFTP (исходники)
/opt/unity/         ← rsync из /opt/app (рабочая директория сборки)
/opt/unity/packages/api/dist/server.js  ← скомпилированный API
/opt/unity/packages/web/.next/          ← скомпилированный Web
/opt/unity/.env     ← production env vars (ГЛАВНЫЙ файл)
/opt/unity/packages/api/uploads/        ← загруженные файлы
```

### PM2:
```bash
pm2 list          # Показать процессы
pm2 logs          # Логи
pm2 monit         # Мониторинг памяти/CPU
# Процессы: unity-api (порт 4000), unity-web (порт 3000)
```

---

## 12. ТЕСТОВЫЕ АККАУНТЫ (production)

| Роль | Email | Пароль | Особенности |
|---|---|---|---|
| Admin | `admin@unity-staff.ru` | `Admin1234!` | Полный доступ |
| Worker | `anna.smirnova@test.ru` | `Worker1234!` | **Ограничен** (низкий рейтинг надёжности) |
| Employer | `prichal@test.ru` | `Test1234!` | Верифицирован, 3 вакансии |

### Другие работники в БД:
- `albertvostrikov@mail.ru` — Альберт Востриков, Premium, Кальянщик
- `alexey.novikov@test.ru` — Алексей Новиков, Повар, rating 4.95 (31 отзыв)
- `dmitry.kozlov@test.ru` — Дмитрий Козлов, Официант, rating 4.7

### Другие работодатели:
- `rest.anchor@test.ru` — Ресторан «Якорь», верифицирован, rating 4.9
- `catering.south@test.ru` — Кейтеринг «Южный», верифицирован

---

## 13. ТЕКУЩИЕ ПРОБЛЕМЫ (не исправлены)

### 🔴 Требуют server actions:
1. **HTTPS не настроен** → `certbot --nginx -d yourdomain.ru`
2. **YooKassa пустой** → заполнить `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`
3. **SITE_URL=localhost** → установить `SITE_URL=http://147.45.235.70` в `/opt/unity/.env`

### 🟠 Требуют правки кода:
4. **Фейковые статы на главной** — "500+ анкет" (реально 5), "35+ анкет" — противоречие
5. **Нет CTA для гостей** на `/vacancies/[id]` — нет кнопки "Войти и откликнуться"
6. **PM2 высокие рестарты** — api:31, web:51 → настроить `--max-memory-restart`

### 🟡 Data issues:
7. **Trailing space** — "Никита  Морус" (двойной пробел)
8. **rate: 299.99** — тест-данные в вакансии
9. **Тест-аккаунты** — test1@mail.ru, test_audit@test.ru, asdasd@mail.ru
10. **Тест-сообщения** в чате — "опа", "ыы", "один", "два"
11. **ratingScore=null** у всех работодателей в каталоге (агрегация отзывов не работает?)

---

## 14. ВАЖНЫЕ ПАТТЕРНЫ КОДА

### Добавить новое поле в вакансию:
1. `prisma/schema.prisma` — добавить поле
2. `prisma migrate dev --name add_field`
3. `packages/api/src/routes/employer/index.ts` — добавить в create/update/response
4. `packages/api/src/routes/catalog/index.ts` — добавить в public response
5. `packages/web/src/components/forms/VacancyForm.tsx` — добавить поле формы
6. `packages/web/src/app/(public)/vacancies/[id]/VacancyPublicDetailPageClient.tsx` — отобразить

### Добавить новый тип уведомления:
1. `packages/api/src/services/notification-service.ts`
2. Вызов: `await fastify.notificationService.create({userId, type, title, body, data})`

### Decimal в API response — правило:
```ts
// Если возвращаешь ПРЯМОЙ Prisma результат — ОК (normalizeMediaFieldsDeep справится)
return replyOk(reply, vacancy);

// Если делаешь SPREAD — ОБЯЗАТЕЛЬНО явно конвертировать Decimal:
return replyOk(reply, {
  ...worker,
  desiredRate: worker.desiredRate != null ? parseFloat(worker.desiredRate.toString()) : null,
  ratingScore: worker.ratingScore != null ? parseFloat(worker.ratingScore.toString()) : null,
});
```

### SEO metadata для новой страницы:
```ts
// Server component → напрямую:
export const metadata: Metadata = {
  title: 'Название страницы',
  description: '...',
  alternates: { canonical: '/path' },
};

// Client component → создать layout.tsx рядом:
// app/(public)/my-page/layout.tsx
export const metadata: Metadata = { ... };
export default function Layout({ children }) { return <>{children}</>; }
```

---

## 15. БИЗНЕС-ЛОГИКА (ключевые правила)

### Подписки работников:
- **Free**: 5 откликов/месяц, стандартное место в каталоге
- **Premium (290₽/мес)**: безлимитные отклики, PREMIUM-бейдж, цветная рамка, статистика, буст

### Подписки работодателей:
- **Старт (free)**: до 3 вакансий, только входящие отклики
- **Бизнес (1990₽/мес)**: до 15 вакансий, полный каталог, аналитика
- **Про (4490₽/мес)**: безлимит, агентские функции

### Сортировка работников в каталоге:
1. Boosted (буст активен) — первыми
2. Premium — следующие
3. Все остальные — по рейтингу

### Ограничение аккаунта (RestrictionBanner):
- `score < 40` ИЛИ `strikeCount >= 3` → `isRestricted = true`
- Ограниченный работник: не может откликаться и получать приглашения
- Сброс: admin в `/admin/users` → `strikeCount=0, isRestricted=false`

### Чат доступен только после:
- Работник откликнулся на вакансию И
- Работодатель пригласил/подтвердил ИЛИ
- Есть активная/завершённая смена

### isVerified для работодателя:
- Устанавливается только через admin panel
- После верификации JWT НЕ нужно обновлять вручную — `isVerified` берётся при login из DB

---

## 16. ИНФРАСТРУКТУРА PRODUCTION

```
Server: 147.45.235.70 (VPS)
OS: Linux (root access)
Nginx: обратный прокси + отдача /uploads
PostgreSQL: работает, DB "unity_db"
Redis: работает (localhost:6379)
PM2: unity-api (порт 4000), unity-web (порт 3000)

Disk: ~17GB/29GB (61%)
HTTPS: НЕ настроен (только HTTP!)
Backups: НЕ настроены!

Env файл: /opt/unity/.env
Uploads: /opt/unity/packages/api/uploads/
```

---

## 17. ОБЩАЯ ГОТОВНОСТЬ К ЗАПУСКУ

| Компонент | Статус |
|---|---|
| Публичный сайт | ✅ 95% |
| Worker кабинет | ✅ 93% |
| Employer кабинет | ✅ 92% |
| Admin кабинет | ✅ 95% |
| API / данные | ✅ 95% |
| SEO | ✅ 82% |
| Платежи | ❌ 20% |
| HTTPS / безопасность | ❌ 60% |
| **Итого** | **87%** |

**Для soft-launch:** настроить SITE_URL + HTTPS + очистить тест-данные (~2-4 часа)
**Для коммерческого:** + YooKassa credentials + мониторинг + pg_dump cron
