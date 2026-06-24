#!/usr/bin/env bash
# Пересобирает secrets.bundle.enc из текущих .env-файлов (после изменения секретов).
# Спросит пароль (используй тот же, что и при расшифровке).
# Запуск:  bash scripts/secrets-encrypt.sh   →  затем git add/commit/push
set -euo pipefail
cd "$(dirname "$0")/.."

FILES=(.env .env.deploy packages/web/.env.local packages/web/.env.production)
for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "Не найден $f — нечего шифровать." >&2
    exit 1
  fi
done

tar -czf - "${FILES[@]}" \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -out secrets.bundle.enc
echo
echo "secrets.bundle.enc обновлён. Закоммить и запушь: git add secrets.bundle.enc && git commit -m 'chore: update secrets bundle' && git push"
