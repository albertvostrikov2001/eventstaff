# -*- coding: utf-8 -*-
"""Отправка тестовых писем через ПРОД SMTP-транспорт (как боевые уведомления).
Адреса берутся из аргументов. Секреты не печатаются — только домен отправителя и результат.
Использование: python send_test_emails.py addr1 addr2 ...
"""
import os, sys, json
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding='utf-8')
for line in (Path(__file__).parent / '.env.deploy').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, _, v = line.partition('='); os.environ.setdefault(k.strip(), v.strip())

recipients = sys.argv[1:] or [
    'albertvostrikov2001@gmail.com',
    'albertvostrikov2001@mail.ru',
    'albertvostrikov2001@yandex.ru',
]

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.environ.get('DEPLOY_HOST', '147.45.235.70'), port=22,
            username='root', password=os.environ.get('DEPLOY_PASS', ''), timeout=30)

def run(cmd, t=180):
    _, o, e = ssh.exec_command(cmd, timeout=t)
    return o.read().decode('utf-8', 'replace'), e.read().decode('utf-8', 'replace')

JS = r'''
require('dotenv').config({ path: '/opt/unity/.env' });
const nodemailer = require('/opt/unity/packages/api/node_modules/nodemailer');
const recipients = JSON.parse(process.env.TEST_RCPT);
const host = (process.env.SMTP_HOST||'').trim();
const user = (process.env.SMTP_USER||'').trim();
const pass = (process.env.SMTP_PASS||'').trim();
const port = parseInt((process.env.SMTP_PORT||'465').trim(), 10);
const secure = (process.env.SMTP_SECURE||'') !== 'false';
const fromEmail = (process.env.SMTP_FROM_EMAIL||process.env.EMAIL_FROM||user).trim();
const fromName = (process.env.SMTP_FROM_NAME||'Юнити').trim();
const from = `${fromName} <${fromEmail}>`;
console.log('FROM_DOMAIN ' + (fromEmail.split('@')[1]||'?'));
(async () => {
  const t = nodemailer.createTransport({ host, port, secure, auth: { user, pass }, tls: { rejectUnauthorized: false } });
  const stamp = new Date().toISOString();
  for (const to of recipients) {
    try {
      const info = await t.sendMail({
        from, to,
        subject: 'Юнити — проверка доставки уведомлений',
        text: 'Это тестовое письмо платформы Юнити для проверки доставки. Если вы его видите — почтовые уведомления работают. Время отправки: ' + stamp,
        html: '<p>Это тестовое письмо платформы <b>Юнити</b> для проверки доставки уведомлений.</p><p>Если вы его видите — почтовые уведомления работают.</p><p style="color:#888">Отправлено: ' + stamp + '</p>',
      });
      console.log('OK     ' + to + '  id=' + (info.messageId||'-') + '  accepted=' + JSON.stringify(info.accepted) + '  rejected=' + JSON.stringify(info.rejected));
    } catch (e) {
      console.log('FAIL   ' + to + '  ' + (e && e.message ? e.message : String(e)));
    }
  }
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
'''
sftp = ssh.open_sftp()
with sftp.open('/opt/unity/packages/api/_sendtest.js', 'w') as f:
    f.write(JS)
sftp.close()

rcpt = json.dumps(recipients)
# Передаём список адресов через переменную окружения (без секретов)
cmd = "cd /opt/unity/packages/api && TEST_RCPT='%s' node _sendtest.js" % rcpt
out, err = run(cmd, t=180)
print(out.rstrip())
if err.strip():
    print('[stderr]', err.strip()[:600])
run('rm -f /opt/unity/packages/api/_sendtest.js')

ssh.close()
print('\nГотово. Проверь «Входящие» и «Спам» на каждом ящике.')
