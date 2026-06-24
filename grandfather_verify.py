# -*- coding: utf-8 -*-
"""One-time: mark all existing email users as verified (grandfather) so re-enabling
mandatory email verification does not lock them out. Prints only the affected row count.
Run: python grandfather_verify.py
"""
import os, sys, re
from pathlib import Path
from urllib.parse import urlparse, unquote
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

def run(cmd, t=60):
    _, o, e = ssh.exec_command(cmd, timeout=t)
    return o.read().decode('utf-8', 'replace'), e.read().decode('utf-8', 'replace')

# Read DATABASE_URL from .env without printing it
out, _ = run("grep -E '^DATABASE_URL=' /opt/unity/.env | head -1 | cut -d= -f2-")
db_url = out.strip().strip('"').strip("'")
if not db_url:
    print('[ERR] DATABASE_URL not found'); ssh.close(); sys.exit(1)

u = urlparse(db_url)
user = unquote(u.username or 'postgres')
pw = unquote(u.password or '')
db = (u.path or '/').lstrip('/').split('?')[0] or 'postgres'

# Count first, then update — run inside the postgres container.
sql_count = "SELECT count(*) FROM users WHERE email IS NOT NULL AND email_verified = false;"
sql_update = "UPDATE users SET email_verified = true WHERE email IS NOT NULL AND email_verified = false;"

def psql(sql):
    safe = sql.replace('"', '\\"')
    cmd = ("docker exec -e PGPASSWORD='%s' unity-postgres "
           "psql -U %s -d %s -tAc \"%s\"" % (pw, user, db, safe))
    return run(cmd)

cnt_out, cnt_err = psql(sql_count)
print('Email users currently unverified:', cnt_out.strip() or '?')
if cnt_err.strip():
    print('[stderr]', cnt_err.strip()[:300])

upd_out, upd_err = psql(sql_update)
print('UPDATE result:', upd_out.strip() or '(no output)')
if upd_err.strip():
    print('[stderr]', upd_err.strip()[:300])

ssh.close()
print('\nDone. Existing email users are now verified; new registrations will require email verification.')
