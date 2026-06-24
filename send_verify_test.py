# -*- coding: utf-8 -*-
"""Тестовая рассылка письма «код верификации» (реальный шаблон Юнити) через прод-SMTP сервера.
Использование: python send_verify_test.py addr1 addr2 ...
Секреты не печатаются.
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

const SITE = 'https://unityevent.ru';
function escapeHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function emailShell(p){
  const prefsUrl = SITE + '/dashboard/settings/notifications';
  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="x-apple-disable-message-reformatting"/><title>${escapeHtml(p.title)}</title>
<style>@media only screen and (max-width:620px){.container{width:100%!important;padding:16px!important;}.h1{font-size:22px!important;}}</style>
</head><body style="margin:0;padding:0;background:#f4f4f5;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(p.previewText||p.title)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f5;padding:24px 12px;"><tr><td align="center">
<table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(13,31,23,0.08);">
<tr><td style="background:#0d1f17;padding:24px;text-align:center;"><span style="display:inline-block;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:34px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">Юнити</span></td></tr>
<tr><td style="padding:28px 28px 8px 28px;font-family:'Playfair Display',Georgia,serif;" class="h1"><h1 style="margin:0;font-size:26px;line-height:1.25;color:#0d1f17;font-weight:600;">${escapeHtml(p.title)}</h1></td></tr>
<tr><td style="padding:8px 28px 28px 28px;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;">
${p.bodyHtml}
<p style="margin:24px 0 0 0;font-size:13px;color:#6b7280;"><a href="${prefsUrl}" style="color:#059669;text-decoration:underline;">Настройки уведомлений и рассылки</a></p>
<p style="margin:12px 0 0 0;font-size:12px;color:#9ca3af;">Это письмо отправлено автоматически, отвечать на него не нужно.</p>
</td></tr></table></td></tr></table></body></html>`;
}
function verificationEmail(code, email){
  const verifyUrl = SITE + '/auth/verify-email?token=demo-' + code;
  const body = `
    <p style="margin:0 0 16px 0;">Здравствуйте!</p>
    <p style="margin:0 0 16px 0;">Спасибо, что присоединились к Юнити. Чтобы завершить регистрацию, подтвердите адрес <strong>${escapeHtml(email)}</strong> — нажмите кнопку ниже.</p>
    <p style="margin:18px 0;"><a href="${escapeHtml(verifyUrl)}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Подтвердить почту</a></p>
    <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">Кнопка не открывается? Скопируйте ссылку в браузер:</p>
    <p style="margin:0 0 16px 0;font-size:13px;word-break:break-all;"><a href="${escapeHtml(verifyUrl)}" style="color:#059669;">${escapeHtml(verifyUrl)}</a></p>
    <p style="margin:0 0 16px 0;font-size:14px;color:#6b7280;">Ссылка действует 24 часа. Если вы не создавали аккаунт на Юнити — просто не отвечайте на это письмо.</p>
    <p style="margin:0;font-size:14px;color:#374151;">Хорошего дня,<br/>команда Юнити</p>`;
  return { subject: 'Подтвердите почту на платформе Юнити', html: emailShell({ title:'Подтверждение почты', previewText:'Подтвердите адрес почты на Юнити', bodyHtml: body }) };
}

const host=(process.env.SMTP_HOST||'').trim(), user=(process.env.SMTP_USER||'').trim(), pass=(process.env.SMTP_PASS||'').trim();
const port=parseInt((process.env.SMTP_PORT||'465').trim(),10), secure=(process.env.SMTP_SECURE||'')!=='false';
const fromEmail=(process.env.SMTP_FROM_EMAIL||process.env.EMAIL_FROM||user).trim();
const fromName=(process.env.SMTP_FROM_NAME||'Юнити').trim();
const from=`${fromName} <${fromEmail}>`;
console.log('FROM ' + from);
(async()=>{
  const t=nodemailer.createTransport({host,port,secure,auth:{user,pass},tls:{rejectUnauthorized:false}});
  for(const to of recipients){
    const code=String(Math.floor(100000+Math.random()*900000));
    const { subject, html }=verificationEmail(code, to);
    try{
      const info=await t.sendMail({ from, to, subject, html, text:'Ваш код подтверждения для регистрации на Юнити: '+code+'. Код действителен 10 минут.' });
      console.log('OK     '+to+'  code='+code+'  accepted='+JSON.stringify(info.accepted)+'  rejected='+JSON.stringify(info.rejected));
    }catch(e){ console.log('FAIL   '+to+'  '+(e&&e.message?e.message:String(e))); }
  }
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
'''

sftp = ssh.open_sftp()
with sftp.open('/opt/unity/packages/api/_verifytest.js', 'w') as f:
    f.write(JS)
sftp.close()

cmd = "cd /opt/unity/packages/api && TEST_RCPT='%s' node _verifytest.js" % json.dumps(recipients)
out, err = run(cmd, t=180)
print(out.rstrip())
if err.strip():
    print('[stderr]', err.strip()[:600])
run('rm -f /opt/unity/packages/api/_verifytest.js')
ssh.close()
print('\nГотово. Проверь «Входящие» и «Спам» — письмо «Подтверждение email — Юнити».')
