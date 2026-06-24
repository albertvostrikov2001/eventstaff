"""
One-off: снять текущие ограничения аккаунтов на проде.
Авто-простановка ограничений отключена в коде; этим скриптом чистим
уже выставленные флаги. Креды через .env.deploy.

Run: python clear_restrictions.py
"""
import os
import sys
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).parent
_env = ROOT / '.env.deploy'
if _env.exists():
    for line in _env.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip())

HOST = os.environ.get('DEPLOY_HOST', '147.45.235.70')
PORT = int(os.environ.get('DEPLOY_PORT', '22'))
USER = os.environ.get('DEPLOY_USER', 'root')
PASS = os.environ.get('DEPLOY_PASS', '')
KEY_PATH = os.environ.get('DEPLOY_KEY_PATH', '')

# Node-скрипт: грузит env через dotenv, считает и снимает ограничения.
NODE = r'''
const dotenv = require('dotenv');
const path = require('node:path');
// Загружаем env так же, как делает API (src/env.ts): сначала корневой .env, затем локальный.
dotenv.config({ path: path.resolve(process.cwd(), '..', '..', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const before = await p.userReliabilityScore.count({ where: { OR: [{ isRestricted: true }, { level: 'RESTRICTED' }] } });
  console.log('restricted before:', before);
  const n = await p.$executeRawUnsafe(
    "UPDATE user_reliability_scores SET is_restricted=false, restricted_at=NULL, restricted_reason=NULL, strike_count=0, level='NEW' WHERE is_restricted=true OR level='RESTRICTED'"
  );
  console.log('rows updated:', n);
  const after = await p.userReliabilityScore.count({ where: { isRestricted: true } });
  console.log('restricted after:', after);
  await p.$disconnect();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
'''

CMD = (
    "cd /opt/unity/packages/api && "
    "node -e " + "'" + NODE.replace("'", "'\\''") + "'"
)


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f'Connecting to {HOST}:{PORT} as {USER} ...')
    if KEY_PATH:
        ssh.connect(HOST, port=PORT, username=USER, key_filename=KEY_PATH, timeout=30)
    else:
        ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
    print('Connected.\n')
    _, stdout, stderr = ssh.exec_command(CMD, timeout=120)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        print(out)
    if err:
        print('[stderr]', err)
    ssh.close()
    print('Done.')


if __name__ == '__main__':
    main()
