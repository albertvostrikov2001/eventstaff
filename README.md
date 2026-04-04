# Юнити — Специализированная биржа event-персонала

Двусторонний marketplace для профессионального event-персонала в ресторанном бизнесе и сфере гостеприимства (HoReCa).

## Стек

| Слой | Технология |
|------|-----------|
| Фронтенд | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Radix UI |
| Бэкенд | Fastify, TypeScript, Prisma ORM |
| База данных | PostgreSQL 15 |
| Кеш/Очереди | Redis 7, BullMQ |
| Монорепо | pnpm workspaces, Turborepo |

## Быстрый старт

### Требования

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

### Установка

```bash
# 1. Клонировать репозиторий
git clone <repo-url> unity
cd unity

# 2. Скопировать переменные окружения
cp .env.example .env

# 3. Запустить PostgreSQL и Redis
docker compose up -d

# 4. Установить зависимости
pnpm install

# 5. Сгенерировать Prisma Client и применить миграции
pnpm db:generate
pnpm db:migrate

# 6. Запустить dev-серверы
pnpm dev
```

После запуска:
- **Фронтенд**: http://localhost:3000
- **API**: http://localhost:4000
- **Swagger документация**: http://localhost:4000/docs
- **Adminer (БД)**: http://localhost:8080

## Структура проекта

```
unity/
├── packages/
│   ├── web/          # Next.js фронтенд
│   ├── api/          # Fastify API сервер
│   └── shared/       # Общие типы, схемы, константы
├── docker-compose.yml
├── .env.example
├── pnpm-workspace.yaml
└── turbo.json
```

## Скрипты

| Команда | Описание |
|---------|----------|
| `pnpm dev` | Запустить все пакеты в dev-режиме |
| `pnpm build` | Собрать все пакеты |
| `pnpm lint` | Линтинг |
| `pnpm typecheck` | Проверка типов |
| `pnpm format` | Форматирование Prettier |
| `pnpm db:generate` | Сгенерировать Prisma Client |
| `pnpm db:migrate` | Применить миграции БД |
| `pnpm db:studio` | Открыть Prisma Studio |

## Переменные окружения

Полный список переменных с описанием — в файле `.env.example`.

## Архитектура

### Роли пользователей
- **Работник** — event-персонал (официанты, бармены, повара и т.д.)
- **Работодатель** — рестораны, кейтеринг, event-агентства, частные заказчики
- **Администратор** — модерация, аналитика, CMS
- **Модератор** — модерация контента

### Основные модули
- Аутентификация (Email, телефон+OTP, OAuth)
- Профили и верификация
- Вакансии с модерацией
- Отклики и статусная машина найма
- Бронирование специалистов
- Чат (WebSocket)
- Отзывы и рейтинги
- Биллинг (ЮKassa)
- Админ-панель с CMS

## Лицензия

Proprietary. Все права защищены.
