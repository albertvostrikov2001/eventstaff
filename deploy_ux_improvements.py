"""
Deploy UX cabinet improvements (13 blocks) to production.
Run: python deploy_ux_improvements.py
Credentials via env or .env.deploy (DEPLOY_HOST/DEPLOY_USER/DEPLOY_PASS or DEPLOY_KEY_PATH).
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

# All files changed/created in the UX cabinet improvement pass (web only)
_REL_FILES = [
    # Block 5 + 12: sidebar dividers + CTA
    r'packages\web\src\components\layout\DashboardSidebar.tsx',
    # Block 3 + 4 + 5 + 12: grouped nav, removed dup notifications/email
    r'packages\web\src\components\layout\EmployerDashboardShell.tsx',
    r'packages\web\src\components\layout\WorkerDashboardShell.tsx',
    # Block 11: user dropdown menu
    r'packages\web\src\components\layout\DashboardTopBar.tsx',
    # Block 2 + 7 + 9: portfolio merge, public-profile link, completion
    r'packages\web\src\app\(worker)\worker\profile\page.tsx',
    # Block 2: media route -> redirect
    r'packages\web\src\app\(worker)\worker\profile\media\page.tsx',
    # Block 7 + 9: public-profile link, completion
    r'packages\web\src\app\(employer)\employer\profile\page.tsx',
    # Block 4: email link in settings
    r'packages\web\src\app\(employer)\employer\settings\page.tsx',
    r'packages\web\src\app\(worker)\worker\settings\page.tsx',
    # Block 4 + 8: breadcrumbs on email settings
    r'packages\web\src\app\(employer)\employer\settings\notifications\page.tsx',
    r'packages\web\src\app\(worker)\worker\settings\notifications\page.tsx',
    # Block 6: clickable applications count
    r'packages\web\src\app\(employer)\employer\vacancies\page.tsx',
    # Block 1: inline accept/decline
    r'packages\web\src\app\(worker)\worker\applications\page.tsx',
    r'packages\web\src\app\(worker)\worker\invitations\page.tsx',
    # Block 10: onboarding checklist on dashboards
    r'packages\web\src\app\(worker)\worker\dashboard\page.tsx',
    r'packages\web\src\app\(employer)\employer\dashboard\page.tsx',
    # New components
    r'packages\web\src\components\worker\DeclineInvitationModal.tsx',
    r'packages\web\src\components\profile\ProfileCompletion.tsx',
    r'packages\web\src\components\dashboard\OnboardingChecklist.tsx',
]


def to_remote(rel):
    return '/opt/app/' + rel.replace('\\', '/')


FILES = [(rel, to_remote(rel)) for rel in _REL_FILES]


def run_cmd(ssh, cmd, timeout=600):
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

    for local_rel, remote_path in FILES:
        local_path = os.path.join(BASE, local_rel)
        if not os.path.exists(local_path):
            print(f'  [SKIP] {local_rel} (not found locally)')
            continue
        ensure_dir(ssh, sftp, os.path.dirname(remote_path))
        print(f'Uploading: {local_rel}')
        sftp.put(local_path, remote_path)
        print('  -> OK')

    sftp.close()

    print('\n-- Syncing /opt/app -> /opt/unity --')
    run_cmd(ssh, 'rsync -a --checksum /opt/app/packages/web/ /opt/unity/packages/web/', timeout=120)

    print('\n-- Building Web (may take a few minutes) --')
    run_cmd(ssh, 'cd /opt/unity && pnpm --filter @unity/web run build 2>&1', timeout=600)

    print('\n-- Restarting unity-web --')
    run_cmd(ssh, 'pm2 restart unity-web', timeout=30)
    time.sleep(3)

    print('\n-- Health check --')
    try:
        run_cmd(ssh, 'curl -sf http://localhost:3000/ -o /dev/null && echo "web OK" || echo "web check failed"', timeout=15)
    except Exception as e:
        print(f'Health check warning: {e}')

    print('\nDeploy complete!')
    print(f'Site: http://{HOST}/')
    ssh.close()


if __name__ == '__main__':
    main()
