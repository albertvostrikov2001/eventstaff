"""Deploy script for 6-tasks update (contacts, chat, invitations, logo, telegram)."""

import paramiko
import time
import os
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

_env_deploy = Path(__file__).parent / '.env.deploy'
if _env_deploy.exists():
    for line in _env_deploy.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip())

HOST     = os.environ.get('DEPLOY_HOST', '147.45.235.70')
PORT     = int(os.environ.get('DEPLOY_PORT', '22'))
USER     = os.environ.get('DEPLOY_USER', 'root')
PASS     = os.environ.get('DEPLOY_PASS', '')
KEY_PATH = os.environ.get('DEPLOY_KEY_PATH', '')
BASE     = os.environ.get('DEPLOY_BASE', str(Path(__file__).parent))

WEB_FILES = [
    # Task 1+2: contacts page (hours + phone field)
    (r'packages\web\src\content\siteContact.ts',
     '/opt/app/packages/web/src/content/siteContact.ts'),
    (r'packages\web\src\app\(public)\contacts\page.tsx',
     '/opt/app/packages/web/src/app/(public)/contacts/page.tsx'),

    # Task 3: admin users — start chat button
    (r'packages\web\src\app\(admin)\admin\users\page.tsx',
     '/opt/app/packages/web/src/app/(admin)/admin/users/page.tsx'),

    # Task 4: VacancyForm + new/edit pages — logo reuse
    (r'packages\web\src\components\forms\VacancyForm.tsx',
     '/opt/app/packages/web/src/components/forms/VacancyForm.tsx'),
    (r'packages\web\src\app\(employer)\employer\vacancies\new\page.tsx',
     '/opt/app/packages/web/src/app/(employer)/employer/vacancies/new/page.tsx'),
    (r'packages\web\src\app\(employer)\employer\vacancies\[id]\edit\EditVacancyPageClient.tsx',
     '/opt/app/packages/web/src/app/(employer)/employer/vacancies/[id]/edit/EditVacancyPageClient.tsx'),

    # Task 5: pricing page — 3 free invitations
    (r'packages\web\src\app\(public)\pricing\PricingClient.tsx',
     '/opt/app/packages/web/src/app/(public)/pricing/PricingClient.tsx'),

    # Task 6: Header — Telegram + Max
    (r'packages\web\src\components\common\Header.tsx',
     '/opt/app/packages/web/src/components/common/Header.tsx'),
]

API_FILES = [
    # Task 2: contact form accepts phone
    (r'packages\api\src\routes\foundation\index.ts',
     '/opt/app/packages/api/src/routes/foundation/index.ts'),

    # Task 5: free plan gets 3 invitations + updated error message
    (r'packages\api\src\services\subscription-service.ts',
     '/opt/app/packages/api/src/services/subscription-service.ts'),
    (r'packages\api\src\routes\employer\index.ts',
     '/opt/app/packages/api/src/routes/employer/index.ts'),
]

ALL_FILES = WEB_FILES + API_FILES
REMOTE_DIRS = set(os.path.dirname(r) for _, r in ALL_FILES)


def run_cmd(ssh, cmd, timeout=300):
    print(f'\n$ {cmd}')
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    exit_code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.strip())
    if err.strip():
        print('[stderr]', err.strip())
    if exit_code != 0:
        raise RuntimeError(f'Command failed (exit {exit_code}): {cmd}')
    return out


def ensure_dir(ssh, sftp, path):
    try:
        sftp.stat(path)
    except FileNotFoundError:
        run_cmd(ssh, f'mkdir -p "{path}"')


def connect():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f'Connecting to {HOST}:{PORT} as {USER} ...')
    kwargs = dict(hostname=HOST, port=PORT, username=USER, timeout=30)
    if KEY_PATH:
        kwargs['key_filename'] = os.path.expanduser(KEY_PATH)
        kwargs['look_for_keys'] = False
    elif PASS:
        kwargs['password'] = PASS
        kwargs['look_for_keys'] = False
    ssh.connect(**kwargs)
    print('Connected.')
    return ssh


def main():
    ssh = connect()
    sftp = ssh.open_sftp()

    for d in REMOTE_DIRS:
        ensure_dir(ssh, sftp, d)

    print(f'\nUploading {len(ALL_FILES)} files...')
    for local_rel, remote_path in ALL_FILES:
        local_path = os.path.join(BASE, local_rel)
        if not os.path.exists(local_path):
            print(f'  [SKIP] {local_rel}')
            continue
        print(f'  {local_rel}')
        sftp.put(local_path, remote_path)
        print('    -> OK')

    sftp.close()

    print('\n-- Syncing /opt/app -> /opt/unity --')
    run_cmd(ssh, 'rsync -a --checksum /opt/app/packages/ /opt/unity/packages/', timeout=60)

    print('\n-- Building API --')
    run_cmd(ssh, 'cd /opt/unity && pnpm --filter @unity/api run build 2>&1', timeout=180)

    print('\n-- Restarting unity-api --')
    run_cmd(ssh, 'pm2 restart unity-api', timeout=30)
    time.sleep(2)

    print('\n-- Building Web (2-3 min) --')
    run_cmd(ssh, 'cd /opt/unity && pnpm --filter @unity/web run build 2>&1', timeout=600)

    print('\n-- Restarting unity-web --')
    run_cmd(ssh, 'pm2 restart unity-web', timeout=30)
    time.sleep(3)

    print('\n-- Health check --')
    try:
        run_cmd(ssh, 'curl -sf http://localhost:4000/api/v1/health || echo "health check failed"', timeout=15)
    except Exception as e:
        print(f'Health check warning: {e}')

    print('\nDeploy complete!')
    print(f'Site: http://{HOST}/')
    ssh.close()


if __name__ == '__main__':
    main()
