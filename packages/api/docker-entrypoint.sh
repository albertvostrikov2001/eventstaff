#!/bin/sh
set -e
cd /app
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is required"
  exit 1
fi
pnpm --filter @unity/api exec prisma db push
cd /app/packages/api
exec node dist/server.js
