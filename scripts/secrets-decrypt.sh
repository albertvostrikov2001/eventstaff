#!/usr/bin/env bash
# Расшифровывает secrets.bundle.enc и восстанавливает .env-файлы.
# Спросит пароль (тот, что сохранён в менеджере паролей).
# Запуск из любого места:  bash scripts/secrets-decrypt.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f secrets.bundle.enc ]; then
  echo "Не найден secrets.bundle.enc в корне проекта." >&2
  exit 1
fi

openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in secrets.bundle.enc | tar -xzvf -
echo
echo "Готово. Восстановлены: .env, .env.deploy, packages/web/.env.local, packages/web/.env.production"
