#!/usr/bin/env bash
# Автоматический деплой на Ubuntu 24.04 (Timeweb Cloud и аналоги).
# Запуск ТОЛЬКО на VPS под root (один раз или повторно — идемпотентно).
#
# Переменные окружения (необязательно):
#   APP_IP    — публичный IPv4 (по умолчанию 147.45.235.70)
#   REPO_URL  — git URL (по умолчанию публичный репозиторий проекта)
#   APP_DIR   — каталог установки (по умолчанию /opt/app)
#
# С вашего ПК (введёте SSH-пароль один раз):
#   Get-Content scripts/timeweb-vps-bootstrap.sh | ssh root@ВАШ_IP bash
#
set -euo pipefail

APP_IP="${APP_IP:-147.45.235.70}"
REPO_URL="${REPO_URL:-https://github.com/albertvostrikov2001/eventstaff.git}"
APP_DIR="${APP_DIR:-/opt/app}"

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Запустите на сервере от root: sudo bash $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "== [1/9] Обновление пакетов =="
apt-get update -y
apt-get upgrade -y

echo "== [2/9] Базовые пакеты, Nginx, ufw, Certbot =="
apt-get install -y ca-certificates curl git nginx ufw certbot python3-certbot-nginx

echo "== [3/9] Docker Engine + Compose plugin =="
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  # shellcheck source=/dev/null
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME:-$VERSION_ID} stable" >/etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "== [4/9] Node.js 22 + pnpm (corepack) =="
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v 2>/dev/null || true)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
corepack enable
corepack prepare pnpm@9.15.0 --activate

echo "== [5/9] Swap 2G (если RAM < 2.5G и swap ещё нет) =="
mem_mb="$(free -m | awk '/^Mem:/{print $2}')"
if [[ "${mem_mb:-0}" -lt 2600 ]] && [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi

echo "== [6/9] ufw: 22, 80, 443 =="
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable || true

echo "== [7/9] Клонирование / обновление репозитория =="
mkdir -p "$APP_DIR"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" pull --ff-only --depth 1 || true
else
  rm -rf "${APP_DIR:?}/"* "${APP_DIR:?}/".[!.]* 2>/dev/null || true
  git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
  JWT_SECRET="$(openssl rand -hex 32)"
  JWT_REFRESH_SECRET="$(openssl rand -hex 32)"
  NEXTAUTH_SECRET="$(openssl rand -hex 24)"
  sed -i \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=\"${JWT_SECRET}\"|" \
    -e "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=\"${JWT_REFRESH_SECRET}\"|" \
    -e "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"${NEXTAUTH_SECRET}\"|" \
    .env
fi

# Прод-URL и режим (при смене APP_IP перезапустите скрипт с новым IP)
sed -i \
  -e "s|^NODE_ENV=.*|NODE_ENV=production|" \
  -e "s|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=\"http://${APP_IP}\"|" \
  -e "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=\"http://${APP_IP}/api/v1\"|" \
  -e "s|^NEXT_PUBLIC_WS_URL=.*|NEXT_PUBLIC_WS_URL=\"http://${APP_IP}\"|" \
  .env

# Postgres/Redis без проброса портов на хост: API ходит по имени сервиса.
# Иначе конфликт с системным redis/postgresql на VPS (address already in use :6379).
cat >docker-compose.override.yml <<EOF
services:
  api:
    ports:
      - "127.0.0.1:4000:4000"
    env_file:
      - .env
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://unity:unity_secret@postgres:5432/unity_db?schema=public
      REDIS_URL: redis://redis:6379
EOF

echo "== [8/9] Docker: postgres, redis, api (без Adminer — порт 8080 часто занят на VPS) =="
docker compose -f docker-compose.yml -f docker-compose.override.yml build --pull api
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d postgres redis api

echo "Ожидание health API..."
for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:4000/api/v1/health" >/dev/null; then
    echo "API OK"
    break
  fi
  sleep 2
  if [[ "$i" -eq 60 ]]; then
    echo "API не поднялся за 120 с. Логи:"
    docker compose -f docker-compose.yml -f docker-compose.override.yml logs --tail 80 api
    exit 1
  fi
done

echo "== [8b/9] Сборка и запуск Next.js на хосте =="
set -a
# shellcheck disable=SC1091
source .env
set +a
pnpm install --frozen-lockfile
pnpm build

PNPM_BIN="$(command -v pnpm)"
cat >/etc/systemd/system/unity-web.service <<EOF
[Unit]
Description=Unity Next.js web
After=network.target docker.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
EnvironmentFile=${APP_DIR}/.env
ExecStart=${PNPM_BIN} --filter @unity/web run start -- -H 127.0.0.1 -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now unity-web

echo "== [9/9] Nginx =="
cat >/etc/nginx/sites-available/app <<NGX
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${APP_IP};

    client_max_body_size 50M;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location /docs {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_read_timeout 300s;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
    }
}
NGX

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/app /etc/nginx/sites-enabled/app
nginx -t
systemctl reload nginx
systemctl enable nginx docker

echo ""
echo "=== Готово ==="
echo "Сайт:     http://${APP_IP}/"
echo "API:      http://${APP_IP}/api/v1/health"
echo "Swagger:  http://${APP_IP}/docs"
echo ""
echo "Проверки:"
echo "  docker ps"
echo "  systemctl status unity-web nginx --no-pager"
echo "  curl -sf http://${APP_IP}/api/v1/health"
echo ""
echo "Adminer (опционально): cd ${APP_DIR} && docker compose -f docker-compose.yml -f docker-compose.override.yml --profile tools run -d --name unity-adminer-once -p 127.0.0.1:18080:8080 adminer"
echo "SSL: certbot --nginx -d ваш.домен  (после A-записи на ${APP_IP})"
