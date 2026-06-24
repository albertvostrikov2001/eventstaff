# -*- coding: utf-8 -*-
"""Удаление 9 тестовых аккаунтов на проде. Сначала pg_dump-бэкап, затем deleteMany (каскад), затем проверка.
Удаляем: 7x @test.ru + asdasd@mail.ru + test1@mail.ru. НЕ трогаем admin@unity-staff.ru и albertvostrikov2001@yandex.ru."""
import os, sys, time
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

def run(cmd, t=180):
    _, o, e = ssh.exec_command(cmd, timeout=t)
    return o.read().decode('utf-8', 'replace'), e.read().decode('utf-8', 'replace')

ts = time.strftime('%Y%m%d_%H%M%S')
backup = f'/root/unity_db_backup_{ts}.sql.gz'

# 1) Бэкап БД (без вывода DATABASE_URL в лог).
print('== Бэкап БД ==')
out, err = run(
    f'set -a; . /opt/unity/.env; set +a; '
    f'pg_dump "$DATABASE_URL" 2>/tmp/pgdump.err | gzip > {backup}; '
    f'if [ -s {backup} ]; then echo "BACKUP_OK"; ls -lh {backup} | awk \'{{print $5, $9}}\'; '
    f'else echo "BACKUP_FAIL"; cat /tmp/pgdump.err | tail -3; fi', t=300)
print((out + err).strip())
if 'BACKUP_OK' not in out:
    print('!! Бэкап не создан — удаление ОТМЕНЕНО.')
    ssh.close(); sys.exit(1)

# 2) Удаление в транзакции через Prisma (каскад на уровне БД).
JS = r'''
require('dotenv').config({ path: '/opt/unity/.env' });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const DEL = [
  'catering.south@test.ru','rest.anchor@test.ru','prichal@test.ru',
  'anna.smirnova@test.ru','dmitry.kozlov@test.ru','alexey.novikov@test.ru','test_audit@test.ru',
  'asdasd@mail.ru','test1@mail.ru',
];
const KEEP = ['admin@unity-staff.ru','albertvostrikov2001@yandex.ru'];
(async () => {
  const before = await p.user.count();
  const targets = await p.user.findMany({ where:{ email:{ in: DEL } }, select:{ id:true, email:true } });
  console.log('К удалению найдено: '+targets.length+' из '+DEL.length+' заявленных');
  for (const t of targets) console.log('  - '+t.email);
  const notFound = DEL.filter(e => !targets.find(t=>t.email===e));
  if (notFound.length) console.log('  (не найдены, пропускаю: '+notFound.join(', ')+')');

  const res = await p.user.deleteMany({ where:{ email:{ in: DEL } } });
  const after = await p.user.count();
  console.log('\nУдалено пользователей: '+res.count);
  console.log('Было: '+before+'  ->  Стало: '+after);

  // Проверка: целевых не осталось.
  const leftover = await p.user.findMany({ where:{ email:{ in: DEL } }, select:{ email:true } });
  console.log('Осталось из целевых (должно быть 0): '+leftover.length);

  // Проверка: защищённые на месте.
  const kept = await p.user.findMany({ where:{ email:{ in: KEEP } }, select:{ email:true, status:true } });
  console.log('Защищённые на месте: '+kept.map(k=>k.email+'['+k.status+']').join(', '));

  // Контроль: ещё какие-либо @test.ru?
  const restTest = await p.user.count({ where:{ email:{ contains:'@test.ru' } } });
  console.log('Осталось @test.ru в базе: '+restTest);
  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
'''
sftp = ssh.open_sftp()
with sftp.open('/opt/unity/packages/api/_del.js', 'w') as f:
    f.write(JS)
sftp.close()
print('\n== Удаление ==')
out, err = run('cd /opt/unity/packages/api && node _del.js', t=120)
print(out.strip())
if err.strip():
    print('[stderr]', err.strip()[:600])
run('rm -f /opt/unity/packages/api/_del.js')

print(f'\nБэкап сохранён на сервере: {backup}')
ssh.close()
print('Done.')
