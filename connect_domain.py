"""
Подключение домена unityevent.ru к проду (Timeweb Cloud VPS).
Шаги: nginx (server_name) -> ssl (certbot) -> env -> build -> verify.
Запуск по шагам:  python connect_domain.py nginx|ssl|env|build|verify
Креды через .env.deploy. Делает бэкапы перед изменениями.
"""
import os
import sys
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).parent
for line in (ROOT / '.env.deploy').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, _, v = line.partition('=')
        os.environ.setdefault(k.strip(), v.strip())

HOST = os.environ.get('DEPLOY_HOST', '147.45.235.70')
PORT = int(os.environ.get('DEPLOY_PORT', '22'))
USER = os.environ.get('DEPLOY_USER', 'root')
PASS = os.environ.get('DEPLOY_PASS', '')
CERT_EMAIL = 'Event-Unity@yandex.ru'

NGINX = r'''
set -e
F=$(grep -rl "127.0.0.1:3000" /etc/nginx 2>/dev/null | head -1)
echo "nginx file: $F"
echo "== server block (server_name / location / listen) =="
awk '/server *{/{p=1} p{print} /^}/{if(p)p=0}' "$F" | grep -E "listen|server_name|location|proxy_pass" | head -40
if grep -q "unityevent.ru" "$F"; then
  echo "ALREADY has domain in server_name"
else
  cp "$F" "$F.bak.$(date +%s)"
  sed -i 's/server_name 147.45.235.70 _;/server_name unityevent.ru www.unityevent.ru 147.45.235.70 _;/' "$F"
  echo "server_name updated"
fi
echo "== server_name now =="
grep -n "server_name" "$F" | head
nginx -t && systemctl reload nginx && echo RELOAD_OK
'''

SSL = (
    "certbot --nginx -d unityevent.ru -d www.unityevent.ru "
    "--non-interactive --agree-tos -m " + CERT_EMAIL + " --redirect --keep-until-expiring 2>&1 | tail -25; "
    "echo '== 443 listening =='; ss -tlnp 2>/dev/null | grep ':443 ' || echo no-443"
)

ENV = r'''
set -e
F=/opt/unity/.env
cp "$F" "$F.bak.$(date +%s)"
upsert(){ k="$1"; v="$2"; if grep -qE "^$k=" "$F"; then sed -i "s|^$k=.*|$k=$v|" "$F"; else printf '%s=%s\n' "$k" "$v" >> "$F"; fi; }
upsert NEXT_PUBLIC_SITE_URL https://unityevent.ru
upsert NEXT_PUBLIC_API_URL https://unityevent.ru/api/v1
upsert NEXT_PUBLIC_WS_URL https://unityevent.ru
upsert NEXT_PUBLIC_MEDIA_URL https://unityevent.ru
upsert SITE_URL https://unityevent.ru
upsert PUBLIC_SITE_URL https://unityevent.ru
upsert PUBLIC_UPLOADS_BASE_URL https://unityevent.ru/uploads
upsert CORS_ORIGINS https://unityevent.ru,https://www.unityevent.ru
upsert PAYMENT_RETURN_URL https://unityevent.ru/payment/return
echo "== URL-related keys now =="
grep -E "^(NEXT_PUBLIC_|SITE_URL|PUBLIC_|CORS_ORIGINS|PAYMENT_RETURN_URL)" "$F"
'''

BUILD = r'''
set -e
cd /opt/unity
echo "== build api =="; pnpm --filter @unity/api run build 2>&1 | tail -4
pm2 restart unity-api 2>&1 | tail -2
echo "== build web =="; pnpm --filter @unity/web run build 2>&1 | tail -6
pm2 restart unity-web 2>&1 | tail -2
pm2 save 2>&1 | tail -1
'''

VERIFY = r'''
echo "--- https home ---"; curl -skI https://unityevent.ru | head -6
echo "--- http -> https redirect ---"; curl -skI http://unityevent.ru | head -6
echo "--- api health over https ---"; curl -sk https://unityevent.ru/api/v1/health; echo
echo "--- pm2 ---"; pm2 ls 2>/dev/null | grep -E "unity-(api|web)"
'''

STEPS = {'nginx': NGINX, 'ssl': SSL, 'env': ENV, 'build': BUILD, 'verify': VERIFY}


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in STEPS:
        print('usage: python connect_domain.py [nginx|ssl|env|build|verify]')
        sys.exit(1)
    step = sys.argv[1]
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f'Connecting to {HOST}:{PORT} ... (step: {step})')
    ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
    print('Connected.\n')
    _, stdout, stderr = ssh.exec_command(STEPS[step], timeout=600)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        print(out)
    if err.strip():
        print('[stderr]', err)
    ssh.close()
    print(f'\n[step {step} done]')


if __name__ == '__main__':
    main()
