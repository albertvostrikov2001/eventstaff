"""
Unity Platform — deploy script.

Uploads changed source files to the production server, rebuilds and restarts
the API and Web processes via PM2.

CREDENTIALS: never store credentials in this file.
Use environment variables or an SSH key pair instead:

    export DEPLOY_HOST=147.45.235.70
    export DEPLOY_USER=root
    export DEPLOY_KEY_PATH=~/.ssh/id_unity_prod    # recommended
    # OR (less secure, avoid in CI):
    export DEPLOY_PASS=your-password-here

Or create a local .env.deploy file (NOT committed to git):
    DEPLOY_HOST=147.45.235.70
    DEPLOY_USER=root
    DEPLOY_KEY_PATH=/home/you/.ssh/id_unity_prod
"""

import paramiko
import time
import os
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# ---------------------------------------------------------------------------
# Load optional .env.deploy for convenience (never commit this file)
# ---------------------------------------------------------------------------
_env_deploy = Path(__file__).parent / '.env.deploy'
if _env_deploy.exists():
    for line in _env_deploy.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip())

HOST = os.environ.get('DEPLOY_HOST', '147.45.235.70')
PORT = int(os.environ.get('DEPLOY_PORT', '22'))
USER = os.environ.get('DEPLOY_USER', 'root')
PASS = os.environ.get('DEPLOY_PASS', '')           # use SSH key instead
KEY_PATH = os.environ.get('DEPLOY_KEY_PATH', '')   # preferred auth method

BASE = os.environ.get('DEPLOY_BASE', str(Path(__file__).parent))

# Files to upload: (local relative path, remote absolute path)
FILES = [
    (
        r'packages\api\src\routes\catalog\index.ts',
        '/opt/app/packages/api/src/routes/catalog/index.ts',
    ),
    (
        r'packages\api\src\routes\employer\index.ts',
        '/opt/app/packages/api/src/routes/employer/index.ts',
    ),
    (
        r'packages\api\src\routes\worker\index.ts',
        '/opt/app/packages/api/src/routes/worker/index.ts',
    ),
    (
        r'packages\api\src\routes\auth\index.ts',
        '/opt/app/packages/api/src/routes/auth/index.ts',
    ),
    (
        r'packages\api\src\lib\media-url.ts',
        '/opt/app/packages/api/src/lib/media-url.ts',
    ),
    (
        r'packages\api\src\lib\public-site-url.ts',
        '/opt/app/packages/api/src/lib/public-site-url.ts',
    ),
    (
        r'packages\web\src\app\(auth)\auth\login\page.tsx',
        '/opt/app/packages/web/src/app/(auth)/auth/login/page.tsx',
    ),
    (
        r'packages\web\src\app\(public)\pricing\PricingClient.tsx',
        '/opt/app/packages/web/src/app/(public)/pricing/PricingClient.tsx',
    ),
    (
        r'packages\web\src\app\(public)\vacancies\[id]\VacancyPublicDetailPageClient.tsx',
        '/opt/app/packages/web/src/app/(public)/vacancies/[id]/VacancyPublicDetailPageClient.tsx',
    ),
    (
        r'packages\web\src\components\forms\VacancyForm.tsx',
        '/opt/app/packages/web/src/components/forms/VacancyForm.tsx',
    ),
    (
        r'packages\web\src\components\catalog\EmployerCard.tsx',
        '/opt/app/packages/web/src/components/catalog/EmployerCard.tsx',
    ),
    (
        r'packages\web\src\app\(public)\employers\page.tsx',
        '/opt/app/packages/web/src/app/(public)/employers/page.tsx',
    ),
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
    else:
        # Fall back to SSH agent / default key locations
        print('  (using SSH agent / default keys)')
    ssh.connect(**connect_kwargs)
    print('Connected.')
    return ssh


def main():
    ssh = connect()
    sftp = ssh.open_sftp()

    for d in REMOTE_DIRS:
        ensure_dir(ssh, sftp, d)

    for local_rel, remote_path in FILES:
        local_path = os.path.join(BASE, local_rel)
        if not os.path.exists(local_path):
            print(f'  [SKIP] {local_rel} (not found locally)')
            continue
        print(f'\nUploading: {local_rel}')
        sftp.put(local_path, remote_path)
        print('  -> OK')

    sftp.close()

    print('\n-- Syncing /opt/app -> /opt/unity --')
    run_cmd(ssh, 'rsync -a --checksum /opt/app/packages/ /opt/unity/packages/', timeout=60)

    print('\n-- Building API --')
    run_cmd(ssh, 'cd /opt/unity && pnpm --filter @unity/api run build 2>&1', timeout=180)

    print('\n-- Restarting unity-api --')
    run_cmd(ssh, 'pm2 restart unity-api', timeout=30)
    time.sleep(2)

    print('\n-- Building Web (may take a few minutes) --')
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
