"""
Switch transactional email to Yandex 360 SMTP (domain unityevent.ru).
Updates non-secret SMTP_* keys in the server .env, clears Resend so mail
goes via Yandex, and leaves SMTP_PASS untouched (set by the user).
Never prints secret values. Credentials via .env.deploy.

Run: python setup_yandex_smtp.py
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

ENV_CANDIDATES = ['/opt/unity/.env', '/opt/unity/packages/api/.env']

# key -> new value. SMTP_PASS intentionally absent (user sets it).
SET = {
    'SMTP_HOST': 'smtp.yandex.ru',
    'SMTP_PORT': '465',
    'SMTP_SECURE': 'true',
    'SMTP_USER': 'noreply@unityevent.ru',
    'SMTP_FROM_EMAIL': 'noreply@unityevent.ru',
    'EMAIL_FROM': 'noreply@unityevent.ru',
    'SMTP_FROM_NAME': 'Юнити',
}
# Clear these so From/transport use SMTP (Yandex), not Resend.
CLEAR = ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'RESEND_FROM_NAME']


def main() -> None:
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
    sftp = cli.open_sftp()

    env_path = None
    for cand in ENV_CANDIDATES:
        try:
            sftp.stat(cand)
            env_path = cand
            break
        except FileNotFoundError:
            continue
    if not env_path:
        print('[ERR] .env not found in', ENV_CANDIDATES)
        cli.close()
        return
    print('env file:', env_path)

    with sftp.open(env_path, 'r') as f:
        content = f.read().decode('utf-8')
    lines = content.splitlines()

    # Backup
    bak = env_path + '.bak-yandex'
    with sftp.open(bak, 'w') as f:
        f.write(content)
    print('backup:', bak)

    def upsert(lines, key, value):
        prefix = key + '='
        for i, ln in enumerate(lines):
            if ln.strip().startswith(prefix) or ln.strip().startswith('#' + prefix):
                lines[i] = f'{key}={value}'
                return lines, 'updated'
        lines.append(f'{key}={value}')
        return lines, 'added'

    changed = []
    for k, v in SET.items():
        lines, how = upsert(lines, k, v)
        changed.append(f'{k} [{how}]')
    for k in CLEAR:
        lines, how = upsert(lines, k, '')
        changed.append(f'{k}=<empty> [{how}]')

    new_content = '\n'.join(lines) + '\n'
    with sftp.open(env_path, 'w') as f:
        f.write(new_content)

    print('\nChanged keys (values hidden):')
    for c in changed:
        print('  -', c)

    # Report SMTP_PASS presence only (never the value)
    pass_set = any(
        ln.strip().startswith('SMTP_PASS=') and ln.split('=', 1)[1].strip() not in ('', '""', "''")
        for ln in lines
    )
    print('\nSMTP_PASS currently:', 'SET (old value — needs replacing with Yandex app password)' if pass_set else 'EMPTY (must be set)')

    sftp.close()
    cli.close()
    print('\nDone. Next: user sets SMTP_PASS to the Yandex app password, then restart unity-api.')


if __name__ == '__main__':
    main()
