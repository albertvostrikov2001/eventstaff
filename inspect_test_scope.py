# -*- coding: utf-8 -*-
"""READ-ONLY: объём связанных данных у тестовых аккаунтов + проверка плейсхолдеров. Ничего не удаляет."""
import os, sys
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding='utf-8')
for line in (Path(__file__).parent / '.env.deploy').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, _, v = line.partition('='); os.environ.setdefault(k.strip(), v.strip())

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.environ.get('DEPLOY_HOST', '147.45.235.70'), port=22,
            username='root', password=os.environ.get('DEPLOY_PASS', ''), timeout=30)

JS = r'''
require('dotenv').config({ path: '/opt/unity/.env' });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const TEST = ['catering.south@test.ru','rest.anchor@test.ru','prichal@test.ru',
  'anna.smirnova@test.ru','dmitry.kozlov@test.ru','alexey.novikov@test.ru','test_audit@test.ru'];
const PLACEHOLDERS = ['test1@mail.ru','asdasd@mail.ru','albertvostrikov2001@yandex.ru'];

(async () => {
  console.log('=== СВЯЗАННЫЕ ДАННЫЕ ТЕСТОВЫХ АККАУНТОВ (уйдёт каскадом) ===');
  for (const email of TEST) {
    const u = await p.user.findUnique({ where:{ email },
      select:{ id:true, activeRole:true,
        workerProfile:{ select:{ id:true } }, employerProfile:{ select:{ id:true } } } });
    if (!u) { console.log('  '+email+': НЕ НАЙДЕН'); continue; }
    let vac=0, apps=0, books=0;
    if (u.employerProfile) {
      vac = await p.vacancy.count({ where:{ employerId: u.employerProfile.id } });
      books = await p.booking.count({ where:{ employerId: u.employerProfile.id } });
    }
    if (u.workerProfile) {
      apps = await p.application.count({ where:{ workerId: u.workerProfile.id } });
      books = await p.booking.count({ where:{ workerId: u.workerProfile.id } });
    }
    const msgs = await p.chatMessage.count({ where:{ senderId: u.id } });
    const pays = await p.payment.count({ where:{ userId: u.id } });
    console.log(`  ${email.padEnd(26)} вакансий=${vac} откликов=${apps} бронир=${books} сообщ=${msgs} платежей=${pays}`);
  }

  console.log('\n=== ПЛАТЕЖИ У ТЕСТОВЫХ (важно: не должно быть реальных оплат) ===');
  const testUsers = await p.user.findMany({ where:{ email:{ in: TEST } }, select:{ id:true, email:true } });
  let anyPay = false;
  for (const u of testUsers) {
    const ps = await p.payment.findMany({ where:{ userId: u.id }, select:{ status:true, amount:true, type:true } });
    if (ps.length) { anyPay = true; console.log('  '+u.email+': '+JSON.stringify(ps)); }
  }
  if (!anyPay) console.log('  платежей нет ни у одного — чисто');

  console.log('\n=== ПЛЕЙСХОЛДЕРЫ ИЗ cleanup.sql (для твоего решения, в список НЕ включаю) ===');
  const ph = await p.user.findMany({ where:{ email:{ in: PLACEHOLDERS } },
    select:{ id:true, email:true, status:true, activeRole:true, createdAt:true } });
  console.log(ph.length ? ph.map(u=>'  '+u.email+' ('+u.activeRole+', '+u.status+') created='+u.createdAt.toISOString().slice(0,10)+' id='+u.id).join('\n') : '  ни одного нет в базе');

  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
'''

sftp = ssh.open_sftp()
with sftp.open('/opt/unity/packages/api/_scope.js', 'w') as f:
    f.write(JS)
sftp.close()
_, o, e = ssh.exec_command('cd /opt/unity/packages/api && node _scope.js', timeout=90)
print(o.read().decode('utf-8', 'replace'))
er = e.read().decode('utf-8', 'replace')
if er.strip():
    print('[stderr]', er.strip()[:500])
ssh.exec_command('rm -f /opt/unity/packages/api/_scope.js')
ssh.close()
print('\nDone.')
