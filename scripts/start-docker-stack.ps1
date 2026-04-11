# Запуск Postgres + Redis + API из корня репозитория.
# Запускайте из PowerShell:  .\scripts\start-docker-stack.ps1
# Требуется: Docker Desktop запущен, окно «Docker Desktop is starting» уже закрылось.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "== Docker: postgres, redis, api + Adminer (profile tools) ==" -ForegroundColor Cyan
docker compose -f docker-compose.yml -f docker-compose.local.yml --profile tools up -d --build
if ($LASTEXITCODE -ne 0) {
  Write-Host @"

Ошибка docker compose. Частые причины на Windows:
  1) Подождите 1–2 минуты после старта Docker Desktop и повторите команду.
  2) Docker Engine вернул 500 — в Docker Desktop: Troubleshoot → Restart.
  3) Порт 5432 или 6379 занят другой программой — остановите локальный PostgreSQL/Redis.

Запуск вручную из папки проекта:
  docker compose -f docker-compose.yml -f docker-compose.local.yml --profile tools up -d --build

"@ -ForegroundColor Yellow
  exit $LASTEXITCODE
}

Write-Host "`n== Ожидание ответа API http://localhost:4000/api/v1/health (до ~90 с) ==" -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 30; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/health" -UseBasicParsing -TimeoutSec 5
    if ($r.StatusCode -eq 200) {
      $ok = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 3
  }
}

if (-not $ok) {
  Write-Host "API не ответил вовремя. Логи: docker compose -f docker-compose.yml -f docker-compose.local.yml logs api --tail 80" -ForegroundColor Yellow
  exit 1
}

Write-Host "API работает." -ForegroundColor Green

$runSeed = Read-Host "Залить тестовые данные (prisma db seed)? [y/N]"
if ($runSeed -eq "y" -or $runSeed -eq "Y") {
  docker compose -f docker-compose.yml -f docker-compose.local.yml exec -T api sh -c "cd /app && pnpm --filter @unity/api exec prisma db seed"
}

Write-Host @"

Дальше:
  1) Файл packages\web\env.docker.local.example скопируйте в packages\web\.env.local
  2) В корне репозитория:  pnpm install  (если ещё не делали)
  3) Запуск фронта:  pnpm dev
  4) Браузер: http://localhost:3000/auth/login

Документация: docs\LOCAL-DOCKER-RU.md

"@ -ForegroundColor Green
