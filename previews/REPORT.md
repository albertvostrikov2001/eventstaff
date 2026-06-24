# Юнити · Preview Set · итоговый отчёт

**58 self-contained HTML артефактов в `previews/`.** Все используют те же design tokens, шрифты Onest + JetBrains Mono и примитивы, что и `eventstaff-patch/`. Каждый артефакт содержит in-artifact toggle переключения Desktop / Mobile в правом верхнем углу.

---

## 1 · Полный список артефактов

### Public + Auth · 23 артефакта

| № | Файл | Маршрут | Компоненты из patch'а |
|---|---|---|---|
| 01 | `01-landing.html` | `/` | Button (primary/muted), Avatar (4 палитры), Badge (eyebrow), `category-card`, footer-link |
| 02 | `02-auth-login.html` | `/auth/login` | Button primary, Input + label, Alert info, Card (light) |
| 03 | `03-auth-register.html` | `/auth/register` | step1+step2 в одном артефакте: role-card, Input (с error), Checkbox custom |
| 04 | `04-auth-forgot.html` | `/auth/forgot-password` | idle + sent состояния side-by-side |
| 05 | `05-auth-reset.html` | `/auth/reset-password` | idle + success + invalid_token (3 состояния) |
| 06 | `06-vacancies.html` | `/vacancies` | Button (filter-toggle), VacancyCard (light), Skeleton, EmptyState |
| 07 | `07-vacancy-detail.html` | `/vacancies/[id]` | EmployerLogoMark, BookMark, scan-block. Loading + 404 |
| 08 | `08-workers.html` | `/workers` | WorkerCard, filter panel, pagination |
| 09 | `09-worker-detail.html` | `/workers/[id]` | UserAvatar (xl), Tag (медкнижка/выезд/переработки), Rating, Review-card, портфолио grid, sidebar CTA |
| 10 | `10-about.html` | `/about` | Card (warm variant), Icon-tile, gradient-cta-card |
| 11 | `11-contacts.html` | `/contacts` | Card (info), form (Input+Textarea+counter), Alert success |
| 12 | `12-pricing.html` | `/pricing` | Card (highlighted с glow), Plan-feature list |
| 13 | `13-for-employers.html` | `/for-employers` | dark-gradient hero, use-case cards, benefit-list, sidebar-cta |
| 14 | `14-for-workers.html` | `/for-workers` | step-card (warm), job-type card, reputation-card |
| 15 | `15-how-it-works.html` | `/how-it-works` | tabs (employer/worker), 6+5 шагов в numbered cards |
| 16 | `16-help.html` | `/help` | native `<details>` accordion 8 FAQ |
| 17 | `17-request.html` | `/request` | tabs (employer/worker), Input + Select + Textarea form |
| 18 | `18-employers.html` | `/employers` | EmployerCard (catalog), filter card |
| 19 | `19-employer-detail.html` | `/employers/[slug]` | hero + 3 stats + активные вакансии + отзывы + sidebar CTA |
| 20 | `20-legal.html` | `/legal/{offer\|privacy\|terms}` | breadcrumb, sticky TOC, structured legal-text (применяется ко всем трём) |
| 21 | `21-payment-return.html` | `/payment/return` | success + ошибка в одном артефакте |
| 22 | `22-not-found.html` | root `not-found.tsx` | dark error-page, 404 code, 2 кнопки |
| 23 | `23-error.html` | `error.tsx` (root + per-group) | 500 + retry + `<details>` со stack trace |

### Worker cabinet · 11 артефактов

Все используют `<WorkerDashboardShell>`: sidebar 14 пунктов + topbar с поиском/notifications/chat/avatar.

| № | Файл | Маршрут | Состояния в артефакте |
|---|---|---|---|
| 24 | `24-worker-dashboard.html` | `/worker/dashboard` | приветствие · pill visibility · 3 stat-карты · ReliabilityWidget (3 KPI) · 2 cards (быстрые действия + приглашения) · последние отклики 5 |
| 25 | `25-worker-profile.html` | `/worker/profile` | большая форма: основная инфо + специализации (chips) + ставка + 4 чекбокса доступности |
| 26 | `26-worker-shifts.html` | `/worker/shifts` | 5 табов · активная смена (glow) · завершённая со «оставьте отзыв» · 4 прошедших · empty state «Спорных смен нет» |
| 27 | `27-worker-invitations.html` | `/worker/invitations` | 4 таба · 2 приглашения с цитатой работодателя и SLA |
| 28 | `28-worker-applications.html` | `/worker/applications` | 5 табов · 5 откликов со всеми статусами · empty state |
| 29 | `29-worker-calendar.html` | `/worker/calendar` | месячный grid с 5 сменами + today-highlight · sidebar: ближайшие смены + CTA закрыть день |
| 30 | `30-worker-earnings.html` | `/worker/earnings` | 5 периодов · 2 stat-карты (заработано/ожидает) · табличка истории 7 строк с export |
| 31 | `31-worker-favorites.html` | `/worker/favorites` | 2 таба · сетка 6 сохранённых вакансий |
| 32 | `32-worker-notifications.html` | `/worker/notifications` | 6 табов · группировка по дате (Сегодня/Вчера/26 мая) · 6 событий с непрочитанными |
| 33 | `33-worker-reviews.html` | `/worker/reviews` | rating summary 4.92★ · распределение оценок · 4 отзыва от работодателей |
| 34 | `34-worker-settings.html` | `/worker/settings` | контакты · смена пароля · видимость · удаление аккаунта (danger) |

### Employer cabinet · 11 артефактов

Sidebar 14 пунктов + sidebar-footer с «Перейти на сайт» и публичными ссылками.

| № | Файл | Маршрут | Состояния |
|---|---|---|---|
| 35 | `35-employer-dashboard.html` | `/employer/dashboard` | приветствие · verified pill · usage banner · 3 stat-карты (вакансии/отклики-glow/избранное) · CTA «Не нашли» · персональные запросы 2 · недавние отклики 3 |
| 36 | `36-employer-vacancies.html` | `/employer/vacancies` | таблица 8 вакансий + 6 status-bdg · **в одном артефакте:** drawer редактирования + модал создания |
| 37 | `37-employer-applications.html` | `/employer/applications` | 6 табов · фильтр по вакансии · плоский список 5 откликов (НЕ канбан — как в коде) |
| 38 | `38-employer-search.html` | `/employer/search` | filter card + grid 6 worker-cards с per-row Профиль/Избранное/Пригласить |
| 39 | `39-employer-favorites.html` | `/employer/favorites` | список 5 сохранённых · история сотрудничества «работали N раз» |
| 40 | `40-employer-invitations.html` | `/employer/invitations` | 4 таба · 4 отправленных приглашения со статусами Ожидает/Принял/Отказалась |
| 41 | `41-employer-payments.html` | `/employer/payments` | текущий тариф · 3 usage-карты · таблица истории 6 строк |
| 42 | `42-employer-profile.html` | `/employer/profile` | company form: лого + основная инфо + контакты + реквизиты ИНН/ОГРН |
| 43 | `43-employer-shifts.html` | `/employer/shifts` | 5 табов · сегодняшняя смена highlighted · 4 предстоящих/завершённых |
| 44 | `44-employer-notifications.html` | `/employer/notifications` | 5 табов · группировка по датам · 5 событий |
| 45 | `45-employer-settings.html` | `/employer/settings` | учётные данные · пароль · команда (2 члена + invite) · удаление компании |

### Chat · 2 артефакта

| № | Файл | Маршрут | Состояния |
|---|---|---|---|
| 46 | `46-chat-list.html` | `/dashboard/chat` | sidebar: поиск + 4 chat-таба + 8 диалогов с контекстом + unread badges. Пустая правая панель «выберите диалог» |
| 47 | `47-chat-thread.html` | `/dashboard/chat/[roomId]` | **все состояния ChatMessageBubble:** in/out/system×3/reply/pending (opacity)/failed (с retry-кнопкой)/read-receipt (CheckCheck в emerald). Pinned-контекст смены · composer с шаблонами быстрых ответов |

### Admin · 11 артефактов

Admin sidebar 11 пунктов с purple-tinted brand-mark + «Admin» badge.

| № | Файл | Маршрут | Содержимое |
|---|---|---|---|
| 48 | `48-admin-dashboard.html` | `/admin/dashboard` | **полный**: 4 KPI · «Требуют модерации» (5 ссылок со счётчиками) · последние действия (audit-feed) · ключевые метрики (конверсия/время отклика/завершённость) |
| 49 | `49-admin-users.html` | `/admin/users` | **эталон**: 6 табов · 4 фильтра · таблица 7 пользователей со всеми статусами · pagination · **в этом же артефакте:** drawer профиля + модал блокировки |
| 50 | `50-admin-vacancies.html` | `/admin/vacancies` | компактная таблица 6 вакансий, статусы active/moderation/archive |
| 51 | `51-admin-applications.html` | `/admin/applications` | 5 откликов · ID/работник/вакансия/работодатель/дата/статус |
| 52 | `52-admin-shifts.html` | `/admin/shifts` | 5 смен · 5 табов включая «Спорные 1» · payment/status badges |
| 53 | `53-admin-complaints.html` | `/admin/complaints` | 5 жалоб · заявитель/цель/причина/статус (new/in_progress/resolved) |
| 54 | `54-admin-individual-requests.html` | `/admin/individual-requests` | 5 заявок индивидуального подбора с типом мероприятия/количеством |
| 55 | `55-admin-contact-requests.html` | `/admin/contact-requests` | 4 обращения через `/contacts` форму с spam-detection |
| 56 | `56-admin-media.html` | `/admin/media` | grid 8 фото-карточек с per-card Отклонить/Одобрить |
| 57 | `57-admin-email-logs.html` | `/admin/email-logs` | 5 строк с шаблоном/получателем/статусом (sent/bounced/queued) |
| 58 | `58-admin-audit-log.html` | `/admin/audit-log` | 6 действий админов: ban/approve_media/verify_employer/resolve_dispute/reject_vacancy/restrict_user |

---

## 2 · Token coverage

Все 58 артефактов используют идентичный набор tokens из `eventstaff-patch/.../globals.css`:

```
COLORS:
  --bg-0..4, --bg-warm-1, --bg-cream-1
  --text-primary/secondary/muted (dark)
  --ink-primary/secondary/muted (light)
  --accent (5bb880) + hover/active/soft/faint
  --accent-warm (c6845c) — для эмоциональных модулей
  --state-{success/warning/danger/info}-{bg}

TYPOGRAPHY:
  Onest 300/400/500/600/700 (display + body)
  JetBrains Mono 400/500 (данные, даты, IDs, badges)
  font-feature-settings: 'ss01'
  Scale: 11/12/13/14/15/17/22/26/28/32/36/40/48 px

RADIUS:  r-1..r-6 (4/6/8/10/14/20)
MOTION:  d-micro 120ms / d-standard 200ms · ease-out
SPACING: 4px base, scale 4/8/12/14/16/18/20/24/32/40/48/64
```

Тема выбирается через `data-shell="dark"` на `<body>` (cabinet + chat + admin) или отсутствие атрибута (public + auth + содержательные страницы).

---

## 3 · Component coverage

Каждый артефакт собран из компонентов, написанных в `eventstaff-patch/.../components/ui/`:

| Компонент | API наружу | Где использован |
|---|---|---|
| **Button** | variant ∈ primary/secondary/outline/muted/ghost/ghost-ink/danger · size ∈ sm/md/lg · disabled/loading | каждый артефакт |
| **Input** | error / type · theme-aware (light + dark) | формы 02, 03, 04, 05, 11, 17, 25, 42, 45 |
| **Textarea** | error · theme-aware | 11, 17, 25, 42, 49, 47 (composer) |
| **Checkbox** | custom, theme-aware | 03, 06, 25, 06, 38 |
| **Badge** | variant ∈ default/primary/success/warning/error/info/violet/sky | каждый cabinet/admin артефакт |
| **Card** | inset / accent="emerald" / warm variant | 10, 11, 12, 19, 24, 25, … |
| **Modal** | always dark, slide-up | 49 (ban modal), 36 (create vacancy modal) |
| **Skeleton** | theme-aware shimmer | 06, 09 |
| **EmptyState** | icon + title + description + action | 06, 28, 26 |
| **RatingStars** | accent (emerald), не amber | 09, 19, 33, 38, 39 |
| **VacancyCard** | full props preserved | 06, 31 |
| **WorkerCard** (производная) | catalog grid layout | 08, 38, 39 |
| **EmployerCard** (производная) | catalog grid layout | 18 |
| **ChatMessageBubble** | variant ∈ in/out/system · status ∈ pending/sent/delivered/read/failed · replyTo · onRetry | 47 |
| **Sidebar (cabinet)** | active state + badges + footer | 24–45, 48–58 |
| **Topbar** | search + notifications + chat + avatar | каждый cabinet |

---

## 4 · Состояния (loading / empty / error / success)

| Тип | Где явно отрисован |
|---|---|
| **Loading skeleton** | 01 (live-катaлог), 06 (vacancy grid), 09 (worker hero), 26 (skeleton-row pattern) |
| **Empty state** | 06 (no results), 08 (no workers), 26 (no disputes), 28 (no applications), 31 (no favorites) |
| **Error state** | 22 (404), 23 (500 с stack trace), 06 (load failed), 05 (invalid token), 01 (error toast) |
| **Success state** | 04 (sent), 05 (password changed), 11 (form sent), 21 (payment success) |
| **Pending / optimistic** | 47 (pending message с opacity) |
| **Failed retry** | 47 (failed message с retry CTA), 21 (payment failed) |

---

## 5 · Расхождения brand book v2.0 ↔ фактический код

Кандидаты на следующую итерацию продукта. Я НЕ внедрял эти паттерны в превью — рендерил строго фактический код.

| Что в brand book'е v2.0 | Что в коде | Решение |
|---|---|---|
| Smart-router в hero лендинга (2 шага inline) | Generic hero с 2 CTA + видео | Не рендерил. Кандидат на v3. |
| Sticky CTA «Откликнуться» на vacancy detail | Нет кнопки отклика на detail (отклик из каталога) | Не рендерил. Спорный паттерн. |
| Канбан откликов у работодателя | Плоский список с табами по статусу | Не рендерил. Канбан — отдельный PR. |
| Trust-блок работодателя на vacancy detail (закрыто смен / no-show / SLA) | Только лого + название + verified-checkmark | Не рендерил. Метрики работодателя в коде ещё не выведены. |
| Live-панель свежих смен на лендинге | Hero + StatsBanner + AudienceFunnel + Categories + How-it-works + Trust + Benefits + Final CTA | Не рендерил. |
| Bottom-tab навигация на mobile worker cabinet | Drawer-меню на mobile | Не рендерил. Архитектурное изменение. |
| Карта-режим в каталоге вакансий | List-only с фильтрами | Не рендерил. |
| Saved searches / подписка на фильтр | Нет в текущем коде | Не рендерил. |

---

## 6 · Page coverage

✅ **Все 58 страниц из inventory отрисованы.**

**Условные дубли:**
- `/employer/workers` и `/employer/search` — отрисован один артефакт «Найти персонал» под маршрут /search. Если /workers имеет отдельный UI — нужно подтвердить.
- `/legal/offer`, `/legal/privacy`, `/legal/terms` — один шаблон.
- `error.tsx` per route group (admin/employer/worker/public) — один общий артефакт (структура одна, отличается только цветом контейнера).

**Не отрисованы как отдельные артефакты:**
- `/admin/_settings`, `/admin/_config` — не было в inventory.
- `/dashboard/company/media` и `/dashboard/profile/media` — общая логика медиа-аплоада, см. `media`-tab в кабинете (легко собрать по паттерну admin/media).
- `(worker)/worker/settings/notifications` и `(employer)/employer/settings/notifications` — checklist каналов/событий, паттерн виден в settings (45, 34).

---

## 7 · Применение к коду

1. **`eventstaff-patch/` уже готов** — `cp -r packages` поверх рабочей копии репо, `pnpm i`, `pnpm --filter web dev`. Тokens активируются, primitive'ы переодеваются автоматически.
2. **Поставить `data-shell="dark"`** на 3 dashboard-shell корня (worker/employer/admin) + на header при необходимости. Это включит dark-варианты Input/Textarea/Card/Skeleton автоматически.
3. **Заменить inline bubble в `ChatRoomView.tsx`** на новый `<ChatMessageBubble>` из патча. ~10 строк, сокет-логика не трогается.
4. **Дочистить инлайн-стили** в страницах, противоречащие токенам (старые `style={{ color: 'var(--u-text-dark)' }}` → `text-ink-primary` или `color-ink-primary` через Tailwind).
5. Перебрать страницы по списку выше, сверяя с соответствующим артефактом из `previews/`.

---

## 8 · Чек-лист integrity

- ✅ Все артефакты — self-contained (single file + Google Fonts CDN)
- ✅ Все артефакты содержат Desktop/Mobile toggle
- ✅ Все артефакты используют те же tokens, что в `eventstaff-patch/`
- ✅ Реальный русский контент во всех — реалистичные имена, суммы, адреса, даты Москва/Новороссийск
- ✅ Согласованный dataset: один и тот же Михаил Костров, Жульверн, Будуар, Catering Group, etc. в каталогах, профилях, кабинетах
- ✅ Состояния loading/empty/error/success покрыты явно
- ✅ `prefers-reduced-motion` уважается через media query
- ✅ Accessibility (semantic html, focus-rings, contrast AA+) сохранён
- ❌ Полностью идентичная вёрстка с фактическим кодом — невозможна без боевого репо. Артефакты — production-fidelity референс, не pixel-perfect клон.

---

## 9 · Что НЕ переносить из артефактов в код

Артефакты — это **визуальный референс структур, токенов и компонентов**. Они НЕ должны напрямую копироваться в React-код. Перенос делается через:
- `eventstaff-patch/styles/globals.css` (tokens)
- `eventstaff-patch/tailwind.config.ts` (semantic palette)
- `eventstaff-patch/components/ui/*` (переписанные примитивы)
- Точечная переработка страниц по паттерну, видному в соответствующем артефакте

---

**Файлы для скачивания:**
- `eventstaff-patch/` — патч для кода (готов к `cp -r`)
- `previews/` — 58 self-contained HTML артефактов
- `Unity Redesign.html` — оригинальный brand book v2.0 (для справки)
