# Unity Platform — Production Deploy Notes

## Required actions before / at launch

### 1. SSL / HTTPS (BLOCKER — do first)
```bash
# On the server (147.45.235.70):
apt update && apt install -y certbot python3-certbot-nginx

# If you have a domain pointing to the server:
certbot --nginx -d yourdomain.ru -d www.yourdomain.ru

# If using IP only for now (self-signed for testing):
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/unity-selfsigned.key \
  -out /etc/ssl/certs/unity-selfsigned.crt
# Then update nginx to use this cert and set HTTP→HTTPS redirect.
```

### 2. Set required env vars in /opt/unity/.env
```env
# Site URL — used for canonical links, media URLs, email links, payment return URLs
SITE_URL=https://yourdomain.ru          # or http://147.45.235.70 if no domain yet

# Payment (YooKassa) — required for subscriptions/shift payments
YOOKASSA_SHOP_ID=your-shop-id
YOOKASSA_SECRET_KEY=your-secret-key
YOOKASSA_WEBHOOK_SECRET=your-webhook-secret

# Payment return URL — where user lands after YooKassa payment
PAYMENT_RETURN_URL=https://yourdomain.ru/payment/return

# CORS — add your production domain
CORS_ORIGINS=https://yourdomain.ru
```

Also update `packages/web/.env.production`:
```env
NEXT_PUBLIC_SITE_URL=https://yourdomain.ru
NEXT_PUBLIC_API_URL=https://yourdomain.ru/api/v1
NEXT_PUBLIC_WS_URL=https://yourdomain.ru
```

### 3. Rebuild after env changes
```bash
cd /opt/unity
pnpm --filter @unity/api run build
pm2 restart unity-api

pnpm --filter @unity/web run build
pm2 restart unity-web
```

### 4. PM2 memory limit (fix high restart count)
```bash
# Check current memory usage:
pm2 monit

# Set memory limit to auto-restart if process exceeds 512MB:
pm2 stop unity-api unity-web
pm2 start /opt/unity/packages/api/dist/server.js \
  --name unity-api \
  --max-memory-restart 512M \
  --node-args="--max-old-space-size=256"

# For web (Next.js standalone):
pm2 start /opt/unity/packages/web/.next/standalone/server.js \
  --name unity-web \
  --max-memory-restart 768M

pm2 save
```

### 5. Pre-launch DB cleanup
```bash
# Review and run with caution:
psql $DATABASE_URL -f /opt/unity/packages/api/prisma/scripts/pre-launch-cleanup.sql
# Edit the file to COMMIT instead of ROLLBACK after reviewing SELECT output.
```

### 6. PostgreSQL backups (cron)
```bash
# Add to crontab:
crontab -e
# Add:
0 3 * * * pg_dump $DATABASE_URL | gzip > /opt/backups/unity-$(date +\%Y\%m\%d).sql.gz
# Keep 7 days:
0 4 * * * find /opt/backups -name "unity-*.sql.gz" -mtime +7 -delete
mkdir -p /opt/backups
```

### 7. Monitoring (recommended before launch)
- Sign up at https://uptimerobot.com — add monitor for http://147.45.235.70/api/v1/health
- Sign up at https://sentry.io — add DSN to `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN`
- PM2 log rotation: `pm2 install pm2-logrotate`

### 8. SSH key auth (security)
```bash
# On your local machine:
ssh-keygen -t ed25519 -C "unity-deploy" -f ~/.ssh/id_unity_prod
ssh-copy-id -i ~/.ssh/id_unity_prod.pub root@147.45.235.70

# Then use in deploy.py:
export DEPLOY_KEY_PATH=~/.ssh/id_unity_prod
python deploy.py

# After confirming key auth works, disable password login:
# /etc/ssh/sshd_config: PasswordAuthentication no
# systemctl restart sshd
```

## Current status after this deploy pass

| Fix | Status |
|---|---|
| NaN rates/ratings (Decimal serialization) | ✅ Fixed globally via `normalizeMediaFieldsDeep` |
| Greeting shows real name/company | ✅ Fixed — login now returns full profile |
| isVerified shows correctly after admin action | ✅ Fixed — login includes `isVerified` from DB |
| Deploy script without plain-text password | ✅ Replaced `deploy_tasks_5.py` with `deploy.py` |
| .env.deploy in .gitignore | ✅ Added |
| SEO: canonical on all public pages | ✅ Added to all public routes |
| SEO: unique descriptions | ✅ Improved |
| HTTPS | ⚠️ Server action required (see §1 above) |
| YooKassa payments | ⚠️ Env action required (see §2 above) |
| Test data cleanup | ⚠️ DB action required (see §5 above) |
| PM2 memory limit | ⚠️ Server action required (see §4 above) |
| PostgreSQL backups | ⚠️ Server action required (see §6 above) |
