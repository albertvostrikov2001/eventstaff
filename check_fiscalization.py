# -*- coding: utf-8 -*-
"""READ-ONLY: включена ли фискализация (наш флаг) + статус регистрации чека у реального платежа в ЮKassa.
Секреты (shopId/secretKey) НЕ печатаются."""
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

def run(c, t=60):
    _, o, e = ssh.exec_command(c, timeout=t)
    return o.read().decode('utf-8', 'replace') + e.read().decode('utf-8', 'replace')

print('=== Флаги фискализации в /opt/unity/.env (не секреты) ===')
print(run('grep -E "^YOOKASSA_SEND_RECEIPT=|^YOOKASSA_VAT_CODE=" /opt/unity/.env || echo "(флаги не заданы)"'))

# Опрашиваем ЮKassa по последнему реальному платёжу: пробит ли чек.
JS = r'''
require('dotenv').config({ path: '/opt/unity/.env' });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const SHOP = process.env.YOOKASSA_SHOP_ID, KEY = process.env.YOOKASSA_SECRET_KEY;
(async () => {
  if (!SHOP || !KEY) { console.log('Ключи ЮKassa не заданы в env'); process.exit(0); }
  const pay = await p.payment.findFirst({
    where: { providerPaymentId: { not: null }, status: 'completed' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, providerPaymentId: true, amount: true, type: true, createdAt: true },
  });
  if (!pay) { console.log('Нет завершённых платежей с providerPaymentId — проверить нечего'); await p.$disconnect(); return; }
  console.log('Последний реальный платёж: type='+pay.type+' amount='+pay.amount+' date='+pay.createdAt.toISOString().slice(0,10));
  const auth = 'Basic ' + Buffer.from(SHOP + ':' + KEY).toString('base64');
  const r = await fetch('https://api.yookassa.ru/v3/payments/' + pay.providerPaymentId, { headers: { Authorization: auth } });
  const j = await r.json();
  console.log('  status:', j.status);
  console.log('  paid:', j.paid);
  console.log('  receipt_registration:', j.receipt_registration ?? '(поле отсутствует — чек не привязан)');
  // Признак, что чек ушёл: либо receipt_registration=succeeded, либо есть отдельный чек в /receipts
  const rc = await fetch('https://api.yookassa.ru/v3/receipts?payment_id=' + pay.providerPaymentId, { headers: { Authorization: auth } });
  const rj = await rc.json();
  const items = Array.isArray(rj.items) ? rj.items : [];
  console.log('  чеков в ЮKassa по платежу:', items.length, items.map(x=>x.status).join(',') || '');
  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
'''
sftp = ssh.open_sftp()
with sftp.open('/opt/unity/packages/api/_fisc.js', 'w') as f:
    f.write(JS)
sftp.close()
print('=== Статус чека у реального платежа (ЮKassa API) ===')
print(run('cd /opt/unity/packages/api && node _fisc.js', t=60))
run('rm -f /opt/unity/packages/api/_fisc.js')
ssh.close()
print('Done.')
