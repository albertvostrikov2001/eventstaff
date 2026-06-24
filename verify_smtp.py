"""
Проверка SMTP-отправителя на проде: verify() авторизации + тестовое письмо.
Пароль читается из /opt/unity/.env на сервере (локально не виден).
Run: python verify_smtp.py
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

JS = r'''
const dotenv = require('dotenv');
const path = require('node:path');
dotenv.config({ path: path.resolve(process.cwd(), '..', '..', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
const nodemailer = require('nodemailer');
const host = process.env.SMTP_HOST, user = process.env.SMTP_USER;
const fromEmail = process.env.SMTP_FROM_EMAIL || user;
const fromName = process.env.SMTP_FROM_NAME || 'Unity';
const t = nodemailer.createTransport({
  host,
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE !== 'false',
  auth: { user, pass: process.env.SMTP_PASS },
  tls: { rejectUnauthorized: false },
});
(async () => {
  try {
    await t.verify();
    console.log('SMTP verify: OK  (user=' + user + ' host=' + host + ')');
    const info = await t.sendMail({
      from: fromName + ' <' + fromEmail + '>',
      to: 'albertvostrikov2001@mail.ru',
      subject: 'Unity SMTP test',
      text: 'Test message from Unity platform. Sender: ' + fromEmail,
    });
    console.log('sendMail: OK  messageId=' + info.messageId);
    console.log('response: ' + (info.response || ''));
  } catch (e) {
    console.error('SMTP ERROR: ' + e.message);
    process.exit(1);
  }
})();
'''


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f'Connecting to {HOST}:{PORT} ...')
    ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
    print('Connected.\n')

    sftp = ssh.open_sftp()
    with sftp.open('/opt/unity/packages/api/_smtp_test.js', 'w') as f:
        f.write(JS)
    sftp.close()

    print('== current SMTP keys (без пароля) ==')
    _, o, _ = ssh.exec_command(
        "grep -E '^SMTP_(HOST|PORT|SECURE|USER|FROM_EMAIL|FROM_NAME)=' /opt/unity/.env", timeout=30)
    print(o.read().decode('utf-8', 'replace'))

    print('== verify + test send ==')
    _, o, e = ssh.exec_command('cd /opt/unity/packages/api && node _smtp_test.js', timeout=180)
    print(o.read().decode('utf-8', 'replace'))
    er = e.read().decode('utf-8', 'replace')
    if er.strip():
        print('[stderr]', er)

    print('== recent unity-api email/SMTP log lines ==')
    _, o, _ = ssh.exec_command(
        "pm2 logs unity-api --nostream --lines 200 2>/dev/null | grep -iE 'smtp|email|mail|535|auth' | tail -15 || true",
        timeout=30)
    print(o.read().decode('utf-8', 'replace') or '(нет упоминаний)')

    ssh.exec_command('rm -f /opt/unity/packages/api/_smtp_test.js')
    ssh.close()
    print('\nDone.')


if __name__ == '__main__':
    main()
