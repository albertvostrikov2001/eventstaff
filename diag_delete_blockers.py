# -*- coding: utf-8 -*-
"""READ-ONLY: почему pg_dump пустой + какие FK на users не каскадные."""
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

print('== pg_dump в системе ==')
print(run('which pg_dump pg_dumpall psql 2>&1; echo "---"; pg_dump --version 2>&1')[0].strip())

print('\n== Ошибка прошлого pg_dump ==')
print(run('cat /tmp/pgdump.err 2>/dev/null | tail -10 || echo "(нет файла)"')[0].strip())

print('\n== Версия сервера PostgreSQL (без вывода пароля) ==')
print(run('set -a; . /opt/unity/.env; set +a; psql "$DATABASE_URL" -tAc "select version();" 2>&1 | head -2')[0].strip())

print('\n== Хост/порт/имя БД из DATABASE_URL (без пароля) ==')
print(run('set -a; . /opt/unity/.env; set +a; '
          'node -e "const u=new URL(process.env.DATABASE_URL); console.log(\'host=\'+u.hostname,\'port=\'+(u.port||5432),\'db=\'+u.pathname.slice(1));"')[0].strip())

print('\n== FK, ссылающиеся на users, и их правило удаления ==')
sql = ("SELECT tc.table_name AS child, rc.delete_rule "
       "FROM information_schema.referential_constraints rc "
       "JOIN information_schema.table_constraints tc ON tc.constraint_name=rc.constraint_name AND tc.constraint_schema=rc.constraint_schema "
       "JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=rc.unique_constraint_name AND ccu.constraint_schema=rc.unique_constraint_schema "
       "WHERE ccu.table_name='users' "
       "ORDER BY rc.delete_rule, child;")
print(run(f'set -a; . /opt/unity/.env; set +a; psql "$DATABASE_URL" -P pager=off -c "{sql}" 2>&1')[0].strip())

ssh.close()
print('\nDone.')
