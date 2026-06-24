# -*- coding: utf-8 -*-
"""READ-ONLY: найти контейнер Postgres + список некаскадных FK на users через Prisma."""
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

print('== docker ps (поиск postgres) ==')
print(run('docker ps --format "{{.Names}} | {{.Image}} | {{.Ports}}" 2>&1 | head -20')[0].strip() or '(docker нет/пусто)')

print('\n== Некаскадные FK на users (через Prisma) ==')
JS = r'''
require('dotenv').config({ path: '/opt/unity/.env' });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const rows = await p.$queryRawUnsafe(`
    SELECT tc.table_name AS child, rc.delete_rule
    FROM information_schema.referential_constraints rc
    JOIN information_schema.table_constraints tc ON tc.constraint_name=rc.constraint_name AND tc.constraint_schema=rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=rc.unique_constraint_name AND ccu.constraint_schema=rc.unique_constraint_schema
    WHERE ccu.table_name='users'
    ORDER BY rc.delete_rule, child;`);
  for (const r of rows) console.log('  '+r.child.padEnd(28)+' '+r.delete_rule);
  const bad = rows.filter(r => r.delete_rule !== 'CASCADE' && r.delete_rule !== 'SET NULL');
  console.log('\n  Блокирующие (не CASCADE/SET NULL): '+(bad.length? bad.map(b=>b.child).join(', ') : 'нет'));
  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
'''
sftp = ssh.open_sftp()
with sftp.open('/opt/unity/packages/api/_fk.js', 'w') as f:
    f.write(JS)
sftp.close()
out, err = run('cd /opt/unity/packages/api && node _fk.js', t=60)
print(out.strip())
if err.strip(): print('[stderr]', err.strip()[:400])
run('rm -f /opt/unity/packages/api/_fk.js')

ssh.close()
print('\nDone.')
