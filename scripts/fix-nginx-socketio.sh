#!/usr/bin/env bash
# Patches the live nginx config to proxy /socket.io/ to the API.
# Run on the VPS as root:
#   bash scripts/fix-nginx-socketio.sh
#
# Works for both setups:
#   PM2  — API on 127.0.0.1:4000  (default)
#   Docker — API on 127.0.0.1:14000 (set API_PORT=14000 before running)
set -euo pipefail

API_PORT="${API_PORT:-4000}"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-available/app}"

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

if [[ ! -f "$NGINX_SITE" ]]; then
  echo "Nginx site file not found: $NGINX_SITE"
  echo "Set NGINX_SITE= to the correct path and re-run."
  exit 1
fi

# Only patch if the block is missing
if grep -q 'location /socket.io/' "$NGINX_SITE"; then
  echo "Socket.IO location block already present in $NGINX_SITE — nothing to do."
else
  # Insert /socket.io/ block before the first "location /api/" line
  sed -i "s|location /api/|location /socket.io/ {\n        proxy_pass http://127.0.0.1:${API_PORT}/socket.io/;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade \$http_upgrade;\n        proxy_set_header Connection \"upgrade\";\n        proxy_set_header Host \$host;\n        proxy_set_header X-Real-IP \$remote_addr;\n        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto \$scheme;\n        proxy_read_timeout 86400;\n        proxy_buffering off;\n    }\n\n    location /api/|" "$NGINX_SITE"
  echo "Inserted /socket.io/ proxy block into $NGINX_SITE"
fi

nginx -t
systemctl reload nginx
echo ""
echo "Done. Verifying Socket.IO endpoint..."
STATUS=$(curl -so /dev/null -w "%{http_code}" "http://127.0.0.1/socket.io/?EIO=4&transport=polling")
if [[ "$STATUS" == "200" ]]; then
  echo "OK — /socket.io/ returns HTTP 200 (Socket.IO handshake working)"
elif [[ "$STATUS" == "400" ]]; then
  echo "OK — /socket.io/ returns HTTP 400 (Socket.IO reachable, handshake parameter missing)"
else
  echo "WARNING — /socket.io/ returned HTTP $STATUS (expected 200 or 400)"
fi
