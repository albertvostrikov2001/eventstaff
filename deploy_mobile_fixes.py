"""
Deploy script for mobile UX fixes.
Uploads only the changed web files, rebuilds and restarts unity-web.
API is NOT touched (no backend changes were made).
"""

import paramiko
import time
import os
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# Load .env.deploy
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

FILES = [
    # Admin tables — overflow-x-auto fix
    (r'packages\web\src\app\(admin)\admin\users\page.tsx',
     '/opt/app/packages/web/src/app/(admin)/admin/users/page.tsx'),
    (r'packages\web\src\app\(admin)\admin\applications\page.tsx',
     '/opt/app/packages/web/src/app/(admin)/admin/applications/page.tsx'),
    (r'packages\web\src\app\(admin)\admin\vacancies\page.tsx',
     '/opt/app/packages/web/src/app/(admin)/admin/vacancies/page.tsx'),
    (r'packages\web\src\app\(admin)\admin\subscriptions\page.tsx',
     '/opt/app/packages/web/src/app/(admin)/admin/subscriptions/page.tsx'),

    # TopBar — mobile overflow fix
    (r'packages\web\src\components\layout\DashboardTopBar.tsx',
     '/opt/app/packages/web/src/components/layout/DashboardTopBar.tsx'),

    # Sidebar — larger tap targets on mobile
    (r'packages\web\src\components\layout\DashboardSidebar.tsx',
     '/opt/app/packages/web/src/components/layout/DashboardSidebar.tsx'),

    # Dashboard headers — flex-wrap fix
    (r'packages\web\src\app\(worker)\worker\dashboard\page.tsx',
     '/opt/app/packages/web/src/app/(worker)/worker/dashboard/page.tsx'),
    (r'packages\web\src\app\(employer)\employer\dashboard\page.tsx',
     '/opt/app/packages/web/src/app/(employer)/employer/dashboard/page.tsx'),
    (r'packages\web\src\app\(worker)\worker\profile\page.tsx',
     '/opt/app/packages/web/src/app/(worker)/worker/profile/page.tsx'),

    # Catalog cards — bigger touch targets + shrink-0 on rate
    (r'packages\web\src\components\catalog\WorkerCard.tsx',
     '/opt/app/packages/web/src/components/catalog/WorkerCard.tsx'),
    (r'packages\web\src\components\catalog\VacancyCard.tsx',
     '/opt/app/packages/web/src/components/catalog/VacancyCard.tsx'),

    # Employer detail — responsive banner height
    (r'packages\web\src\app\(public)\employers\[slug]\EmployerDetailPageClient.tsx',
     '/opt/app/packages/web/src/app/(public)/employers/[slug]/EmployerDetailPageClient.tsx'),
]

REMOTE_DIRS = set(os.path.dirname(r) for _, r in FILES)


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


def connect() -> paramiko.SSHClient:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f'Connecting to {HOST}:{PORT} as {USER} ...')
    connect_kwargs = dict(hostname=HOST, port=PORT, username=USER, timeout=30)
    if KEY_PATH:
        connect_kwargs['key_filename'] = os.path.expanduser(KEY_PATH)
        connect_kwargs['look_for_keys'] = False
    elif PASS:
        connect_kwargs['password'] = PASS
        connect_kwargs['look_for_keys'] = False
    ssh.connect(**connect_kwargs)
    print('Connected.')
    return ssh


def main():
    ssh = connect()
    sftp = ssh.open_sftp()

    for d in REMOTE_DIRS:
        ensure_dir(ssh, sftp, d)

    print(f'\nUploading {len(FILES)} changed files...')
    for local_rel, remote_path in FILES:
        local_path = os.path.join(BASE, local_rel)
        if not os.path.exists(local_path):
            print(f'  [SKIP] {local_rel} (not found locally)')
            continue
        print(f'  {local_rel}')
        sftp.put(local_path, remote_path)
        print('    -> OK')

    sftp.close()

    print('\n-- Syncing /opt/app -> /opt/unity --')
    run_cmd(ssh, 'rsync -a --checksum /opt/app/packages/web/ /opt/unity/packages/web/', timeout=60)

    print('\n-- Building Web (may take 2-3 minutes) --')
    run_cmd(ssh, 'cd /opt/unity && pnpm --filter @unity/web run build 2>&1', timeout=600)

    print('\n-- Restarting unity-web --')
    run_cmd(ssh, 'pm2 restart unity-web', timeout=30)
    time.sleep(3)

    print('\nDeploy complete!')
    print(f'Site: http://{HOST}/')
    ssh.close()


if __name__ == '__main__':
    main()
