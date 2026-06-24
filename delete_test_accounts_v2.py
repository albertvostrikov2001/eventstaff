# -*- coding: utf-8 -*-
"""Удаление 9 тестовых аккаунтов: РАБОЧИЙ бэкап (docker pg_dump) + транзакция (дочерние RESTRICT-строки, затем users).
Удаляем: 7x @test.ru + asdasd@mail.ru + test1@mail.ru. НЕ трогаем admin@unity-staff.ru, albertvostrikov2001@yandex.ru."""
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

def run(cmd, t=300):
    _, o, e = ssh.exec_command(cmd, timeout=t)
    return o.read().decode('utf-8', 'replace'), e.read().decode('utf-8', 'replace')

ts = time.strftime('%Y%m%d_%H%M%S')
backup = f'/root/unity_db_backup_{ts}.sql.gz'

# 1) РАБОЧИЙ бэкап через pg_dump внутри контейнера (URL из env, без вывода пароля).
print('== Бэкап БД (docker exec pg_dump) ==')
cmd = (
    'set -a; . /opt/unity/.env; set +a; '
    'PGURL=$(node -e "process.stdout.write(process.env.DATABASE_URL.split(\'?\')[0])"); '
    f'docker exec -e PGURL="$PGURL" unity-postgres sh -c \'pg_dump "$PGURL"\' 2>/tmp/pgd.err | gzip > {backup}; '
    f'CT=$(gunzip -c {backup} 2>/dev/null | grep -c "CREATE TABLE"); '
    f'SZ=$(gunzip -c {backup} 2>/dev/null | wc -c); '
    f'echo "CREATE_TABLE=$CT UNCOMPRESSED_BYTES=$SZ"; ls -lh {backup} | awk \'{{print "file_size="$5}}\'; '
    f'if [ "$CT" -ge 15 ]; then echo BACKUP_OK; else echo BACKUP_FAIL; tail -3 /tmp/pgd.err; fi'
)
out, err = run(cmd, t=300)
print((out + err).strip())
if 'BACKUP_OK' not in out:
    print('!! Рабочий бэкап не создан — удаление ОТМЕНЕНО.')
    ssh.close(); sys.exit(1)

# 2) Удаление в одной транзакции: дочерние RESTRICT-строки -> users (остальное каскадом).
JS = r'''
require('dotenv').config({ path: '/opt/unity/.env' });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const DEL = ['catering.south@test.ru','rest.anchor@test.ru','prichal@test.ru',
  'anna.smirnova@test.ru','dmitry.kozlov@test.ru','alexey.novikov@test.ru','test_audit@test.ru',
  'asdasd@mail.ru','test1@mail.ru'];
const KEEP = ['admin@unity-staff.ru','albertvostrikov2001@yandex.ru'];
(async () => {
  const before = await p.user.count();
  const idsRows = await p.$queryRawUnsafe(`SELECT id, email FROM users WHERE email IN (${DEL.map(e=>`'${e}'`).join(',')})`);
  console.log('Найдено к удалению: '+idsRows.length+' из '+DEL.length);
  const inList = idsRows.map(r=>`'${r.id}'`).join(',');
  if (!idsRows.length) { console.log('Нет целевых — выход.'); await p.$disconnect(); return; }

  // Порядок: листовые RESTRICT-дети -> users (профили/вакансии/брони/чат уйдут каскадом).
  const stmts = [
    `DELETE FROM shift_reviews  WHERE reviewer_id IN (${inList}) OR reviewee_id IN (${inList})`,
    `DELETE FROM shift_payments WHERE payer_id    IN (${inList}) OR payee_id    IN (${inList})`,
    `DELETE FROM shifts         WHERE employer_id IN (${inList}) OR worker_id   IN (${inList})`,
    `DELETE FROM reviews        WHERE author_id   IN (${inList}) OR target_id   IN (${inList})`,
    `DELETE FROM reports        WHERE reporter_id IN (${inList}) OR target_id   IN (${inList})`,
    `DELETE FROM messages       WHERE sender_id   IN (${inList}) OR receiver_id IN (${inList})`,
    `DELETE FROM payments       WHERE user_id     IN (${inList})`,
    `DELETE FROM complaint_history WHERE admin_id IN (${inList})`,
    `DELETE FROM complaints     WHERE author_id   IN (${inList})`,
    `DELETE FROM blacklist      WHERE user_id     IN (${inList}) OR created_by  IN (${inList})`,
    `DELETE FROM users          WHERE id          IN (${inList})`,
  ];
  const results = await p.$transaction(stmts.map(s => p.$executeRawUnsafe(s)));
  stmts.forEach((s,i)=>{ const t=s.split(' ').filter(Boolean)[2]; console.log('  '+String(results[i]).padStart(4)+'  '+t); });

  const after = await p.user.count();
  console.log('\nПользователей было: '+before+'  ->  стало: '+after+'  (удалено '+(before-after)+')');
  const leftover = await p.user.count({ where:{ email:{ in: DEL } } });
  console.log('Осталось из целевых (должно быть 0): '+leftover);
  const restTest = await p.user.count({ where:{ email:{ contains:'@test.ru' } } });
  console.log('Осталось @test.ru в базе: '+restTest);
  const kept = await p.user.findMany({ where:{ email:{ in: KEEP } }, select:{ email:true, status:true } });
  console.log('Защищённые на месте: '+(kept.map(k=>k.email+'['+k.status+']').join(', ')||'НЕТ — ТРЕВОГА'));
  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
'''
sftp = ssh.open_sftp()
with sftp.open('/opt/unity/packages/api/_del2.js', 'w') as f:
    f.write(JS)
sftp.close()
print('\n== Удаление (транзакция) ==')
out, err = run('cd /opt/unity/packages/api && node _del2.js', t=120)
print(out.strip())
if err.strip(): print('[stderr]', err.strip()[:600])
run('rm -f /opt/unity/packages/api/_del2.js')

print(f'\nБэкап на сервере: {backup}')
ssh.close()
print('Done.')
