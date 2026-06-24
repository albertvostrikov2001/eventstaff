"""
Создаёт тестового работодателя — частное лицо прямо в проде
(emailVerified=true, чтобы можно было сразу войти).

Заливает seed_test_employer.js на сервер и запускает его внутри
/opt/unity/packages/api с загруженным DATABASE_URL. Креды — ниже.

Run: python seed_test_employer.py
"""
import paramiko
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

# Тестовые креды для входа в кабинет работодателя — частного лица.
SEED_EMAIL = 'test.lichnoe@unityevent.ru'
SEED_PASSWORD = 'Zakulisie2026!'

REMOTE_JS = '/opt/unity/packages/api/seed_test_employer.js'

LOAD_ENV = (
    'set -a; '
    'for f in /opt/unity/.env /opt/unity/packages/api/.env /opt/unity/packages/api/prisma/.env /opt/app/.env; do '
    '[ -f "$f" ] && . "$f"; done; '
    'set +a; '
)


def run_cmd(ssh, cmd, timeout=120):
    print(f'\n$ {cmd.replace(SEED_PASSWORD, "***")}')
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.strip())
    if err.strip():
        print('[stderr]', err.strip())
    if code != 0:
        raise RuntimeError(f'Command failed (exit {code})')
    return out


def main():
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

    sftp = ssh.open_sftp()
    with open(ROOT / 'seed_test_employer.js', 'rb') as f:
        with sftp.open(REMOTE_JS, 'wb') as r:
            r.write(f.read())
    sftp.close()
    print('Seed script uploaded.')

    run_cmd(
        ssh,
        LOAD_ENV
        + f"cd /opt/unity/packages/api && SEED_EMAIL='{SEED_EMAIL}' "
        + f"SEED_PASSWORD='{SEED_PASSWORD}' node {REMOTE_JS}",
    )
    run_cmd(ssh, f'rm -f {REMOTE_JS}')

    print('\n=== Тестовый работодатель — частное лицо ===')
    print(f'  Email:  {SEED_EMAIL}')
    print(f'  Пароль: {SEED_PASSWORD}')
    print('  Вход:   https://unityevent.ru/auth/login')
    ssh.close()


if __name__ == '__main__':
    main()
