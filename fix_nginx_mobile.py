# -*- coding: utf-8 -*-
"""Фикс зависания мобильных: убрать Upgrade с location /, включить http2, добавить таймауты.
Безопасно: бэкап -> правка -> nginx -t -> reload; при ошибке теста — откат."""
import os, sys
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding='utf-8')
for line in (Path(__file__).parent / '.env.deploy').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, _, v = line.partition('='); os.environ.setdefault(k.strip(), v.strip())

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.environ.get('DEPLOY_HOST', '147.45.235.70'), port=22,
            username='root', password=os.environ.get('DEPLOY_PASS', ''), timeout=30)

def run(cmd, t=60):
    _, o, e = ssh.exec_command(cmd, timeout=t)
    return o.read().decode('utf-8', 'replace'), e.read().decode('utf-8', 'replace')

# 1. Найти файл конфига.
out, _ = run('ls /etc/nginx/sites-enabled/')
fname = (out.split() or ['default'])[0]
path = f'/etc/nginx/sites-enabled/{fname}'
print('config file:', path)

sftp = ssh.open_sftp()
with sftp.open(path, 'r') as f:
    cfg = f.read().decode('utf-8')

orig = cfg

# Бэкап (вне sites-enabled, иначе nginx его тоже подхватит).
bak = '/root/unity.nginx.bak-mobilefix'
with sftp.open(bak, 'w') as f:
    f.write(orig)
print('backup ->', bak)

LOC_OLD = """  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
  }"""

LOC_NEW = """  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_connect_timeout 5s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }"""

n_loc = cfg.count(LOC_OLD)
cfg = cfg.replace(LOC_OLD, LOC_NEW)
print(f'location / blocks updated: {n_loc}')

# http2
n_h2 = cfg.count('listen 443 ssl;')
cfg = cfg.replace('listen 443 ssl;', 'listen 443 ssl http2;')
print(f'listen 443 -> http2: {n_h2}')

if cfg == orig:
    print('!! Ничего не изменилось — шаблон не совпал. Прерываю без правок.')
    sftp.close(); ssh.close(); sys.exit(1)

with sftp.open(path, 'w') as f:
    f.write(cfg)

# Тест и reload.
test_out, test_err = run('nginx -t 2>&1')
print('\n== nginx -t ==')
print((test_out + test_err).strip())

if 'test is successful' in (test_out + test_err):
    rel_out, rel_err = run('systemctl reload nginx 2>&1; echo RELOAD_DONE')
    print('\n== reload ==')
    print((rel_out + rel_err).strip())
else:
    print('\n!! Тест не прошёл — откатываю конфиг из бэкапа.')
    with sftp.open(path, 'w') as f:
        f.write(orig)
    run(f'rm -f {bak}')
    print('Откат выполнен, nginx не перезагружался.')
    sftp.close(); ssh.close(); sys.exit(1)

sftp.close()

# Проверка http2 и кода ответа.
ver, _ = run('curl -sI --http2 https://unityevent.ru/ 2>&1 | head -5')
print('\n== curl https://unityevent.ru/ ==')
print(ver.strip())

ssh.close()
print('\nDone.')
