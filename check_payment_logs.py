"""
Читает логи unity-api по платёжному потоку (вебхук, ЮKassa, подписки) — read-only.
Run: python check_payment_logs.py
"""
import os
import sys
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).parent
for line in (ROOT / '.env.deploy').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, _, v = line.partition('=')
        os.environ.setdefault(k.strip(), v.strip())

HOST = os.environ.get('DEPLOY_HOST', '147.45.235.70')
PORT = int(os.environ.get('DEPLOY_PORT', '22'))
USER = os.environ.get('DEPLOY_USER', 'root')
PASS = os.environ.get('DEPLOY_PASS', '')


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f'Connecting to {HOST}:{PORT} ...')
    ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
    print('Connected.\n')

    print('== unity-api logs: платёжный поток (последние совпадения) ==')
    _, o, _ = ssh.exec_command(
        "pm2 logs unity-api --nostream --lines 1200 2>/dev/null | "
        "grep -iE 'yookassa|webhook|payment|shiftpay|subscription|grant|PAYMENT_RECEIVED|511|payments/' "
        "| tail -40 || true",
        timeout=40)
    print(o.read().decode('utf-8', 'replace') or '(нет совпадений по платежам)')

    print('\n== unity-api: ошибки/warn за последнее время ==')
    _, o, _ = ssh.exec_command(
        "pm2 logs unity-api --nostream --lines 1200 2>/dev/null | "
        "grep -iE '\"level\":(50|40)|error|failed|GATEWAY|mismatch' | tail -20 || true",
        timeout=40)
    print(o.read().decode('utf-8', 'replace') or '(ошибок не найдено)')

    ssh.close()
    print('\nDone.')


if __name__ == '__main__':
    main()
