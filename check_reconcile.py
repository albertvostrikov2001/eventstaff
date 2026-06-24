# -*- coding: utf-8 -*-
"""Ждёт фоновую сверку платежей и проверяет восстановление потерянного 290 руб."""
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

# Ждём до 5 минут срабатывания крона, затем читаем логи сверки.
_, o, _ = ssh.exec_command(
    'sleep 240; pm2 logs unity-api --nostream --lines 400 2>/dev/null '
    '| grep -iE "payment_reconcile_granted|payment_reconcile_failed|Email sent|Подписка" | tail -8',
    timeout=300)
print('== логи сверки/выдачи ==')
print(o.read().decode('utf-8', 'replace') or '(нет записей)')

# Read-only проверка: статус потерянного платежа и подписки работника.
JS = r'''
require('dotenv').config({ path: '/opt/unity/.env' });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const pay = await p.payment.findUnique({ where: { id: 'cmq87r8yx0009enn8cunrgwhb' }, select: { status: true, type: true, amount: true } });
  console.log('Payment 290:', JSON.stringify(pay));
  const sub = await p.workerSubscription.findUnique({ where: { workerId: 'cmq85ct0r0003endx5x4uhvac' }, select: { plan: true, status: true, currentPeriodEnd: true } });
  console.log('WorkerSubscription:', JSON.stringify(sub));
  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
'''
sftp = ssh.open_sftp()
with sftp.open('/opt/unity/packages/api/_chk.js', 'w') as f:
    f.write(JS)
sftp.close()
_, o, e = ssh.exec_command('cd /opt/unity/packages/api && node _chk.js', timeout=40)
print('\n== статус платежа и подписки ==')
print(o.read().decode('utf-8', 'replace'))
er = e.read().decode('utf-8', 'replace')
if er.strip():
    print('[stderr]', er[:300])
ssh.exec_command('rm -f /opt/unity/packages/api/_chk.js')
ssh.close()
print('\nDone.')
