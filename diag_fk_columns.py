# -*- coding: utf-8 -*-
"""READ-ONLY: точные колонки FK на users + сколько строк в RESTRICT-таблицах у целевых юзеров."""
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

def run(cmd, t=120):
    _, o, e = ssh.exec_command(cmd, timeout=t)
    return o.read().decode('utf-8', 'replace'), e.read().decode('utf-8', 'replace')

JS = r'''
require('dotenv').config({ path: '/opt/unity/.env' });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const DEL = ['catering.south@test.ru','rest.anchor@test.ru','prichal@test.ru',
  'anna.smirnova@test.ru','dmitry.kozlov@test.ru','alexey.novikov@test.ru','test_audit@test.ru',
  'asdasd@mail.ru','test1@mail.ru'];
(async () => {
  // FK-колонки всех таблиц, ссылающихся на users.
  const cols = await p.$queryRawUnsafe(`
    SELECT tc.table_name AS child, kcu.column_name AS col, rc.delete_rule
    FROM information_schema.referential_constraints rc
    JOIN information_schema.table_constraints tc ON tc.constraint_name=rc.constraint_name AND tc.constraint_schema=rc.constraint_schema
    JOIN information_schema.key_column_usage kcu ON kcu.constraint_name=rc.constraint_name AND kcu.constraint_schema=rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=rc.unique_constraint_name AND ccu.constraint_schema=rc.unique_constraint_schema
    WHERE ccu.table_name='users'
    ORDER BY rc.delete_rule, child, col;`);
  console.log('=== FK на users: таблица.колонка (правило) ===');
  for (const r of cols) console.log('  '+ (r.child+'.'+r.col).padEnd(40)+' '+r.delete_rule);

  // Сколько строк в RESTRICT-таблицах реально завязано на целевых юзеров.
  const restrict = cols.filter(r => r.delete_rule==='RESTRICT');
  console.log('\n=== Строк в RESTRICT-таблицах у целевых юзеров ===');
  const idsRows = await p.$queryRawUnsafe(`SELECT id FROM users WHERE email IN (${DEL.map(e=>`'${e}'`).join(',')})`);
  const ids = idsRows.map(r=>r.id);
  const inList = ids.map(i=>`'${i}'`).join(',');
  for (const r of restrict) {
    try {
      const c = await p.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "${r.child}" WHERE "${r.col}" IN (${inList})`);
      if (c[0].n > 0) console.log('  '+(r.child+'.'+r.col).padEnd(40)+' = '+c[0].n);
    } catch(e) { console.log('  '+(r.child+'.'+r.col)+' ERR '+e.message.slice(0,60)); }
  }
  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
'''
sftp = ssh.open_sftp()
with sftp.open('/opt/unity/packages/api/_fkc.js', 'w') as f:
    f.write(JS)
sftp.close()
out, err = run('cd /opt/unity/packages/api && node _fkc.js', t=90)
print(out.strip())
if err.strip(): print('[stderr]', err.strip()[:400])
run('rm -f /opt/unity/packages/api/_fkc.js')
ssh.close()
print('\nDone.')
