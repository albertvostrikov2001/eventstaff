"""
Finish the blocks deploy: source the server's existing env (without printing it),
apply the migration, rebuild API + Web, restart PM2.
Source is already synced by deploy_blocks.py.

Run: python deploy_blocks_finish.py
"""
import paramiko
import time
import os
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).parent
_env = ROOT / '.env.deploy'
if _env.exists():
    for line in _env.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip())

HOST = os.environ.get('DEPLOY_HOST', '147.45.235.70')
PORT = int(os.environ.get('DEPLOY_PORT', '22'))
USER = os.environ.get('DEPLOY_USER', 'root')
PASS = os.environ.get('DEPLOY_PASS', '')
KEY_PATH = os.environ.get('DEPLOY_KEY_PATH', '')

# Sources whichever env file exists (loads vars into shell env without printing them).
LOAD_ENV = (
    'set -a; '
    'for f in /opt/unity/.env /opt/unity/packages/api/.env /opt/unity/packages/api/prisma/.env /opt/app/.env; do '
    '[ -f "$f" ] && . "$f"; done; '
    'set +a; '
)


def run_cmd(ssh, cmd, timeout=600):
    print(f'\n$ {cmd}')
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.strip())
    if err.strip():
        print('[stderr]', err.strip())
    if code != 0:
        raise RuntimeError(f'Command failed (exit {code}): {cmd}')
    return out


def connect():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f'Connecting to {HOST}:{PORT} as {USER} ...')
    kw = dict(hostname=HOST, port=PORT, username=USER, timeout=30)
    if KEY_PATH:
        kw['key_filename'] = os.path.expanduser(KEY_PATH)
        kw['look_for_keys'] = False
    elif PASS:
        kw['password'] = PASS
        kw['look_for_keys'] = False
    ssh.connect(**kw)
    print('Connected.')
    return ssh


def main():
    ssh = connect()

    # Verify a DATABASE_URL is resolvable from the env files (presence only, value never printed).
    print('\n-- Checking env availability (no secrets printed) --')
    run_cmd(ssh, LOAD_ENV + 'if [ -n "$DATABASE_URL" ]; then echo "DATABASE_URL: present"; else echo "DATABASE_URL: MISSING"; exit 1; fi')

    print('\n-- Applying DB migration --')
    run_cmd(ssh, LOAD_ENV + 'cd /opt/unity/packages/api && pnpm prisma migrate deploy 2>&1', timeout=180)

    print('\n-- Regenerating Prisma client --')
    run_cmd(ssh, 'cd /opt/unity/packages/api && pnpm prisma generate 2>&1', timeout=120)

    print('\n-- Building API --')
    run_cmd(ssh, 'cd /opt/unity && pnpm --filter @unity/api run build 2>&1', timeout=300)

    print('\n-- Restarting unity-api --')
    run_cmd(ssh, 'pm2 restart unity-api', timeout=30)
    time.sleep(2)

    print('\n-- Building Web (may take a few minutes) --')
    run_cmd(ssh, 'cd /opt/unity && pnpm --filter @unity/web run build 2>&1', timeout=600)

    print('\n-- Restarting unity-web --')
    run_cmd(ssh, 'pm2 restart unity-web', timeout=30)
    time.sleep(3)

    print('\n-- Health checks --')
    try:
        run_cmd(ssh, 'curl -sf http://localhost:4000/api/v1/health -o /dev/null && echo "api OK" || echo "api check failed"', timeout=15)
        run_cmd(ssh, 'curl -sf http://localhost:3000/ -o /dev/null && echo "web OK" || echo "web check failed"', timeout=15)
    except Exception as e:
        print(f'Health check warning: {e}')

    print('\nDeploy complete!')
    print(f'Site: http://{HOST}/')
    ssh.close()


if __name__ == '__main__':
    main()
