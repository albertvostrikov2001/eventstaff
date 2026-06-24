"""
Deploy all audit fixes to production.
Run: python deploy_audit_fixes.py
Credentials via env or .env.deploy (see deploy.py for format).
"""
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

HOST = os.environ.get('DEPLOY_HOST', '147.45.235.70')
PORT = int(os.environ.get('DEPLOY_PORT', '22'))
USER = os.environ.get('DEPLOY_USER', 'root')
PASS = os.environ.get('DEPLOY_PASS', '')
KEY_PATH = os.environ.get('DEPLOY_KEY_PATH', '')
BASE = os.environ.get('DEPLOY_BASE', str(Path(__file__).parent))

# All files changed in this audit-fix pass
FILES = [
    # BLOCK 1: Decimal/NaN fix (global serializer)
    (r'packages\api\src\lib\media-url.ts',
     '/opt/app/packages/api/src/lib/media-url.ts'),
    # BLOCK 2: Auth store — login returns full profile
    (r'packages\api\src\routes\auth\index.ts',
     '/opt/app/packages/api/src/routes/auth/index.ts'),
    (r'packages\web\src\app\(auth)\auth\login\page.tsx',
     '/opt/app/packages/web/src/app/(auth)/auth/login/page.tsx'),
    # BLOCK 3: public-site-url production warning
    (r'packages\api\src\lib\public-site-url.ts',
     '/opt/app/packages/api/src/lib/public-site-url.ts'),
    # BLOCK 5: SEO — canonicals
    (r'packages\web\src\app\(public)\page.tsx',
     '/opt/app/packages/web/src/app/(public)/page.tsx'),
    (r'packages\web\src\app\(public)\pricing\page.tsx',
     '/opt/app/packages/web/src/app/(public)/pricing/page.tsx'),
    (r'packages\web\src\app\(public)\how-it-works\page.tsx',
     '/opt/app/packages/web/src/app/(public)/how-it-works/page.tsx'),
    (r'packages\web\src\app\(public)\about\page.tsx',
     '/opt/app/packages/web/src/app/(public)/about/page.tsx'),
    (r'packages\web\src\app\(public)\help\page.tsx',
     '/opt/app/packages/web/src/app/(public)/help/page.tsx'),
    (r'packages\web\src\app\(public)\vacancies\layout.tsx',
     '/opt/app/packages/web/src/app/(public)/vacancies/layout.tsx'),
    (r'packages\web\src\app\(public)\legal\terms\page.tsx',
     '/opt/app/packages/web/src/app/(public)/legal/terms/page.tsx'),
    (r'packages\web\src\app\(public)\legal\privacy\page.tsx',
     '/opt/app/packages/web/src/app/(public)/legal/privacy/page.tsx'),
    (r'packages\web\src\app\(public)\legal\offer\page.tsx',
     '/opt/app/packages/web/src/app/(public)/legal/offer/page.tsx'),
    # SEO — new layout files (create dirs if needed)
    (r'packages\web\src\app\(public)\workers\layout.tsx',
     '/opt/app/packages/web/src/app/(public)/workers/layout.tsx'),
    (r'packages\web\src\app\(public)\employers\layout.tsx',
     '/opt/app/packages/web/src/app/(public)/employers/layout.tsx'),
    (r'packages\web\src\app\(public)\contacts\layout.tsx',
     '/opt/app/packages/web/src/app/(public)/contacts/layout.tsx'),
    (r'packages\web\src\app\(public)\request\layout.tsx',
     '/opt/app/packages/web/src/app/(public)/request/layout.tsx'),
    # Previously deployed (keep synced)
    (r'packages\web\src\components\catalog\EmployerCard.tsx',
     '/opt/app/packages/web/src/components/catalog/EmployerCard.tsx'),
    (r'packages\web\src\app\(public)\vacancies\[id]\VacancyPublicDetailPageClient.tsx',
     '/opt/app/packages/web/src/app/(public)/vacancies/[id]/VacancyPublicDetailPageClient.tsx'),
    (r'packages\web\src\components\forms\VacancyForm.tsx',
     '/opt/app/packages/web/src/components/forms/VacancyForm.tsx'),
    (r'packages\api\src\routes\catalog\index.ts',
     '/opt/app/packages/api/src/routes/catalog/index.ts'),
    # Cleanup script (read-only reference — not executed automatically)
    (r'packages\api\prisma\scripts\pre-launch-cleanup.sql',
     '/opt/app/packages/api/prisma/scripts/pre-launch-cleanup.sql'),
    (r'DEPLOY_NOTES.md',
     '/opt/app/DEPLOY_NOTES.md'),
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
    sftp = ssh.open_sftp()

    for d in REMOTE_DIRS:
        ensure_dir(ssh, sftp, d)

    for local_rel, remote_path in FILES:
        local_path = os.path.join(BASE, local_rel)
        if not os.path.exists(local_path):
            print(f'  [SKIP] {local_rel} (not found locally)')
            continue
        ensure_dir(ssh, sftp, os.path.dirname(remote_path))
        print(f'\nUploading: {local_rel}')
        sftp.put(local_path, remote_path)
        print('  -> OK')

    sftp.close()

    print('\n-- Syncing /opt/app -> /opt/unity --')
    run_cmd(ssh, 'rsync -a --checksum /opt/app/packages/ /opt/unity/packages/', timeout=60)
    run_cmd(ssh, 'rsync -a /opt/app/DEPLOY_NOTES.md /opt/unity/DEPLOY_NOTES.md', timeout=10)

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
