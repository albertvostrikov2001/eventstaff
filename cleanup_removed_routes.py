# -*- coding: utf-8 -*-
"""Удаляет на проде каталоги удалённых разделов (employer/payments, worker/earnings)
из /opt/app и /opt/unity (stale-файлы от прошлых деплоев), пересобирает веб и
перезапускает unity-web. Запуск: python cleanup_removed_routes.py"""
import os, sys, paramiko
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(__file__).parent
for line in (ROOT / '.env.deploy').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, _, v = line.partition('='); os.environ.setdefault(k.strip(), v.strip())

ssh = paramiko.SSHClient(); ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print('Connecting...')
ssh.connect(os.environ.get('DEPLOY_HOST', '147.45.235.70'), port=22,
            username='root', password=os.environ.get('DEPLOY_PASS', ''), timeout=30)
print('Connected.')

def run(cmd, timeout=600):
    print(f'\n$ {cmd}')
    _, o, e = ssh.exec_command(cmd, timeout=timeout)
    out = o.read().decode('utf-8', 'replace'); err = e.read().decode('utf-8', 'replace')
    code = o.channel.recv_exit_status()
    if out.strip(): print(out.strip())
    if err.strip(): print('[stderr]', err.strip())
    if code != 0: raise RuntimeError(f'exit {code}: {cmd}')
    return out

DIRS = [
    '/opt/app/packages/web/src/app/(employer)/employer/payments',
    '/opt/app/packages/web/src/app/(worker)/worker/earnings',
    '/opt/unity/packages/web/src/app/(employer)/employer/payments',
    '/opt/unity/packages/web/src/app/(worker)/worker/earnings',
]
for d in DIRS:
    run(f'rm -rf "{d}"')

print('\n-- Verify removed --')
run('ls "/opt/unity/packages/web/src/app/(employer)/employer" | grep -i pay || echo "no payments dir (ok)"')
run('ls "/opt/unity/packages/web/src/app/(worker)/worker" | grep -i earn || echo "no earnings dir (ok)"')

print('\n-- Rebuild web --')
run('cd /opt/unity && pnpm --filter @unity/web run build 2>&1 | grep -E "employer/payments|worker/earnings|Compiled|error" || true', timeout=600)

print('\n-- Restart --')
run('pm2 restart unity-web')

print('\n-- Route presence check (should be empty) --')
run('cd /opt/unity/packages/web && grep -rl "" .next/server/app/employer/payments 2>/dev/null | head -1 || echo "payments route gone"')
run('cd /opt/unity/packages/web && grep -rl "" .next/server/app/worker/earnings 2>/dev/null | head -1 || echo "earnings route gone"')

ssh.close()
print('\nDone.')
