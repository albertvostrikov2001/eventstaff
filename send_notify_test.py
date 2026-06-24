# -*- coding: utf-8 -*-
"""Диагностика: отправка письма-уведомления (НЕ верификация) через прод-SMTP.
Другой контент/тема — проверяем, режет ли Яндекс именно письмо с кодом.
Использование: python send_notify_test.py addr1 [addr2 ...]
"""
import os, sys, json
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding='utf-8')
for line in (Path(__file__).parent / '.env.deploy').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, _, v = line.partition('='); os.environ.setdefault(k.strip(), v.strip())

recipients = sys.argv[1:] or ['albertvostrikov2001@mail.ru']

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
const SITE='https://unityevent.ru';
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function shell(p){const prefs=SITE+'/dashboard/settings/notifications';
 return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(p.title)}</title></head>
 <body style="margin:0;padding:0;background:#f4f4f5;">
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f5;padding:24px 12px;"><tr><td align="center">
 <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(13,31,23,0.08);">
 <tr><td style="background:#0d1f17;padding:24px;text-align:center;"><span style="font-family:'Segoe UI',Arial,sans-serif;font-size:34px;font-weight:800;color:#fff;">Юнити</span></td></tr>
 <tr><td style="padding:28px 28px 8px 28px;font-family:Georgia,serif;"><h1 style="margin:0;font-size:24px;color:#0d1f17;">${esc(p.title)}</h1></td></tr>
 <tr><td style="padding:8px 28px 28px 28px;font-family:'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;">${p.body}
 <p style="margin:24px 0 0 0;font-size:13px;color:#6b7280;"><a href="${prefs}" style="color:#059669;">Настройки уведомлений</a></p></td></tr>
 </table></td></tr></table></body></html>`;}
const host=(process.env.SMTP_HOST||'').trim(),user=(process.env.SMTP_USER||'').trim(),pass=(process.env.SMTP_PASS||'').trim();
const port=parseInt((process.env.SMTP_PORT||'465').trim(),10),secure=(process.env.SMTP_SECURE||'')!=='false';
const fromEmail=(process.env.SMTP_FROM_EMAIL||process.env.EMAIL_FROM||user).trim();
const from=`${(process.env.SMTP_FROM_NAME||'Юнити').trim()} <${fromEmail}>`;
console.log('FROM '+from);
(async()=>{
 const t=nodemailer.createTransport({host,port,secure,auth:{user,pass},tls:{rejectUnauthorized:false}});
 const body=`<p style="margin:0 0 14px 0;">Здравствуйте!</p>
  <p style="margin:0 0 14px 0;">На вашу вакансию «Официант на банкет» откликнулся новый кандидат — <strong>Анна К.</strong>, опыт 3 года, рейтинг 4.8.</p>
  <p style="margin:0 0 14px 0;">Посмотрите анкету и ответьте кандидату в личном кабинете.</p>
  <p style="margin:18px 0;"><a href="${SITE}/employer/applications" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Открыть отклики</a></p>`;
 for(const to of recipients){
  try{const info=await t.sendMail({from,to,subject:'Новый отклик на вашу вакансию',html:shell({title:'Новый отклик',body}),text:'На вашу вакансию откликнулся новый кандидат. Откройте кабинет: '+SITE+'/employer/applications'});
   console.log('OK     '+to+'  accepted='+JSON.stringify(info.accepted)+'  rejected='+JSON.stringify(info.rejected));
  }catch(e){console.log('FAIL   '+to+'  '+(e&&e.message?e.message:String(e)));}
 }
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
'''
sftp=ssh.open_sftp()
with sftp.open('/opt/unity/packages/api/_notifytest.js','w') as f: f.write(JS)
sftp.close()
o,e=run("cd /opt/unity/packages/api && TEST_RCPT='%s' node _notifytest.js" % json.dumps(recipients))
print(o.rstrip())
if e.strip(): print('[stderr]', e.strip()[:500])
run('rm -f /opt/unity/packages/api/_notifytest.js')
ssh.close()
