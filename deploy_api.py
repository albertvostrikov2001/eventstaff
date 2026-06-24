"""
API-only deploy: syncs packages/api/src, rebuilds API (tsup), restarts unity-api.
No DB/schema/migrations. Credentials via .env.deploy.

Run: python deploy_api.py
"""
import paramiko
import tarfile
import io
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

SYNC_DIRS = [
    'packages/api/src',
    'packages/shared/src',
]
REMOTE_TMP = '/tmp/unity_deploy_api.tar.gz'


def build_tarball() -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz') as tar:
        for rel in SYNC_DIRS:
            local = ROOT / rel
            if not local.exists():
                print(f'  [WARN] missing {rel}, skipped')
                continue
            tar.add(str(local), arcname=rel)
    buf.seek(0)
    return buf.read()


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
    print('Building source tarball...')
    data = build_tarball()
    print(f'  tarball size: {len(data) // 1024} KB')

    ssh = connect()
    sftp = ssh.open_sftp()
    print('\nUploading tarball...')
    with sftp.open(REMOTE_TMP, 'wb') as f:
        f.write(data)
    print('  -> OK')
    sftp.close()

    run_cmd(ssh, 'rm -rf /opt/app/packages')
    run_cmd(ssh, f'mkdir -p /opt/app && tar -xzf {REMOTE_TMP} -C /opt/app')
    run_cmd(ssh, 'rsync -a --delete /opt/app/packages/api/src/ /opt/unity/packages/api/src/')
    run_cmd(ssh, 'rsync -a --delete /opt/app/packages/shared/src/ /opt/unity/packages/shared/src/')

    print('\n-- Building API (tsup) --')
    run_cmd(ssh, 'cd /opt/unity && pnpm --filter @unity/api run build 2>&1', timeout=600)

    print('\n-- Restarting unity-api --')
    run_cmd(ssh, 'pm2 restart unity-api', timeout=30)
    time.sleep(3)

    print('\n-- Health check --')
    try:
        run_cmd(ssh, 'curl -sf http://localhost:4000/api/v1/health -o /dev/null && echo "api OK" || echo "api check failed"', timeout=15)
    except Exception as e:
        print(f'Health check warning: {e}')

    run_cmd(ssh, f'rm -f {REMOTE_TMP}')
    print('\nDeploy complete!')
    ssh.close()


if __name__ == '__main__':
    main()
