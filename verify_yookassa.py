"""
Проверяет боевые ключи ЮKassa: GET /v3/me (статус магазина, активация,
фискализация). Секретный ключ читается из /opt/unity/.env на сервере и
НЕ печатается. В вывод идут только безопасные поля ответа ЮKassa.
Run: python verify_yookassa.py
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
require('dotenv').config({ path: '/opt/unity/.env' });
const shopId = (process.env.YOOKASSA_SHOP_ID || '').trim();
const key = (process.env.YOOKASSA_SECRET_KEY || '').trim();
const sendReceipt = process.env.YOOKASSA_SEND_RECEIPT;
const vatCode = process.env.YOOKASSA_VAT_CODE;
if (!shopId || !key) {
  console.log('KEYS_PRESENT: shopId=' + (!!shopId) + ' secretKey=' + (!!key));
  console.log('-> Ключи не найдены в /opt/unity/.env');
  process.exit(0);
}
const auth = 'Basic ' + Buffer.from(shopId + ':' + key).toString('base64');
(async () => {
  const r = await fetch('https://api.yookassa.ru/v3/me', { headers: { Authorization: auth } });
  const j = await r.json().catch(() => ({}));
  console.log('HTTP ' + r.status);
  console.log('account_id (shopId): ' + j.account_id);
  console.log('status:              ' + j.status);
  console.log('test:                ' + j.test);
  console.log('fiscalization_enabled: ' + j.fiscalization_enabled);
  console.log('payment_methods:     ' + (Array.isArray(j.payment_methods) ? j.payment_methods.join(', ') : j.payment_methods));
  console.log('--- наш конфиг env ---');
  console.log('YOOKASSA_SEND_RECEIPT: ' + sendReceipt);
  console.log('YOOKASSA_VAT_CODE:     ' + vatCode);
  if (r.status !== 200) {
    console.log('!! Ответ не 200 — ключи неверны или магазин недоступен. error=' + (j.code || j.description || ''));
  }
})().catch((e) => { console.error('ERR ' + e.message); process.exit(1); });
'''


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f'Connecting to {HOST}:{PORT} ...')
    ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
    print('Connected.\n')

    sftp = ssh.open_sftp()
    with sftp.open('/opt/unity/packages/api/_yk_me.js', 'w') as f:
        f.write(JS)
    sftp.close()

    print('== YooKassa GET /v3/me ==')
    _, o, e = ssh.exec_command('cd /opt/unity/packages/api && node _yk_me.js', timeout=60)
    print(o.read().decode('utf-8', 'replace'))
    er = e.read().decode('utf-8', 'replace')
    if er.strip():
        print('[stderr]', er)

    ssh.exec_command('rm -f /opt/unity/packages/api/_yk_me.js')
    ssh.close()
    print('\nDone.')


if __name__ == '__main__':
    main()
