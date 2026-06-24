# -*- coding: utf-8 -*-
"""READ-ONLY: перечислить тестовые аккаунты (@test.ru) на проде и пересчитать реальные.
Ничего не удаляет. Нужно, чтобы пользователь сверил список перед удалением."""
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

const SEED = [
  'admin@test.ru','employer-active@test.ru','employer-new@test.ru',
  'worker-active@test.ru','worker-new@test.ru',
  'worker-restricted@test.ru','worker-banned@test.ru',
];

(async () => {
  // 1) Точное совпадение с сид-аккаунтами.
  const seeded = await p.user.findMany({
    where: { email: { in: SEED } },
    select: { id:true, email:true, status:true, activeRole:true, createdAt:true,
      workerProfile:{ select:{ id:true, slug:true } },
      employerProfile:{ select:{ id:true, slug:true, companyName:true } } },
    orderBy: { email: 'asc' },
  });
  console.log('=== СИД-АККАУНТЫ, НАЙДЕННЫЕ В БАЗЕ ('+seeded.length+'/7) ===');
  for (const u of seeded) {
    const prof = u.workerProfile? ('worker:'+u.workerProfile.slug)
      : u.employerProfile? ('employer:'+u.employerProfile.slug+' "'+(u.employerProfile.companyName||'')+'"') : 'нет профиля';
    console.log(`  ${u.email.padEnd(28)} role=${(u.activeRole||'').padEnd(9)} status=${(u.status||'').padEnd(10)} created=${u.createdAt.toISOString().slice(0,10)} | ${prof}`);
    console.log(`     id=${u.id}`);
  }
  const foundEmails = new Set(seeded.map(u=>u.email));
  const missing = SEED.filter(e=>!foundEmails.has(e));
  if (missing.length) console.log('  (нет в базе: '+missing.join(', ')+')');

  // 2) Любые ДРУГИЕ аккаунты с @test.ru (на случай ручных тестовых).
  const otherTest = await p.user.findMany({
    where: { AND: [{ email: { contains: '@test.ru' } }, { email: { notIn: SEED } }] },
    select: { id:true, email:true, status:true, activeRole:true },
  });
  console.log('\n=== ПРОЧИЕ @test.ru (не из сида) ===');
  console.log(otherTest.length ? otherTest.map(u=>'  '+u.email+' ('+u.activeRole+', '+u.status+') id='+u.id).join('\n') : '  нет');

  // 3) Общая картина: всего пользователей и сколько НАСТОЯЩИХ (не @test.ru).
  const total = await p.user.count();
  const realCount = await p.user.count({ where: { NOT: { email: { contains: '@test.ru' } } } });
  console.log('\n=== ИТОГ ===');
  console.log('  Всего пользователей в базе: '+total);
  console.log('  Из них тестовых (@test.ru): '+(total-realCount));
  console.log('  НАСТОЯЩИХ (будут нетронуты): '+realCount);

  // 4) Все админы — чтобы не задеть «настоящего» админа.
  const admins = await p.user.findMany({
    where: { roles: { some: { role: 'admin' } } },
    select: { email:true, status:true },
  });
  console.log('\n=== ВСЕ АДМИНЫ В СИСТЕМЕ ===');
  console.log(admins.map(a=>'  '+(a.email||'(нет email)')+' ['+a.status+']').join('\n') || '  нет');

  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
'''

sftp = ssh.open_sftp()
with sftp.open('/opt/unity/packages/api/_list_test.js', 'w') as f:
    f.write(JS)
sftp.close()
_, o, e = ssh.exec_command('cd /opt/unity/packages/api && node _list_test.js', timeout=60)
print(o.read().decode('utf-8', 'replace'))
er = e.read().decode('utf-8', 'replace')
if er.strip():
    print('[stderr]', er.strip()[:500])
ssh.exec_command('rm -f /opt/unity/packages/api/_list_test.js')
ssh.close()
print('\nDone.')
