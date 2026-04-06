# Docker Desktop не запускается (Windows) — «Starting the Docker Engine…»

Это **не ошибка проекта EventStaff**. Движок Docker зависит от виртуализации и (обычно) **WSL2**.

## 1. Проверка WSL (частая причина)

Откройте **PowerShell** или **cmd** и выполните:

```powershell
wsl -l -v
```

Если пишет, что **нет установленных дистрибутивов** или WSL не установлен:

1. Запустите **PowerShell от имени администратора**.
2. Выполните:
   ```powershell
   wsl --install
   ```
3. **Перезагрузите компьютер** (Windows обычно сам попросит).
4. После перезагрузки дождитесь окончания установки Ubuntu (если откроется окно первого запуска — задайте логин/пароль или пропустите по инструкции Windows).
5. Снова запустите **Docker Desktop**.

Альтернатива: установите **Ubuntu** из **Microsoft Store**, затем перезагрузка и снова Docker Desktop.

## 2. Включить компоненты Windows

В PowerShell **от администратора**:

```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

Перезагрузка, затем (при необходимости):

```powershell
wsl --set-default-version 2
```

## 3. Виртуализация в BIOS/UEFI

В BIOS должны быть включены **Intel VT-x** / **AMD-V** и (если есть) **Virtualization** / **SVM Mode**. Иначе WSL2 и Docker не стартуют.

## 4. Конфликты с другими программами

Отключите или удалите на время проверки:

- старый **VirtualBox** с активным адаптером,
- **Hyper-V** и **WSL2** одновременно с некоторыми эмуляторами Android,
- корпоративный антивирус, блокирующий гипервизор (исключения по инструкции IT).

## 5. Сброс Docker Desktop

В **Docker Desktop** → **Settings** (шестерёнка) → **Troubleshoot**:

- **Restart Docker Desktop**
- при необходимости **Reset to factory defaults** (удалит контейнеры/образы локально)

## 6. Обновление

Установите последнюю **Docker Desktop** с [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) и актуальные обновления **Windows 10 (22H2+)** или **Windows 11**.

## 7. Работа без Docker (обходной путь)

Если Docker так и не нужен срочно:

- Установите **PostgreSQL** и **Redis** для Windows (или только Postgres + Redis в облаке).
- В корне проекта настройте `.env` с `DATABASE_URL` и `REDIS_URL`.
- API: `pnpm db:generate` → `pnpm --filter @unity/api exec prisma db push` → `pnpm --filter @unity/api dev`
- Фронт: `pnpm dev`

Подробнее: `docs/LOCAL-DOCKER-RU.md` (вариант с Docker, когда он уже работает).
