# -*- coding: utf-8 -*-
"""Read recent email_logs from prod (status + error) to diagnose delivery. Read-only."""
import os, sys
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

out, _ = run("grep -E '^DATABASE_URL=' /opt/unity/.env | head -1 | cut -d= -f2-")
db_url = out.strip().strip('"').strip("'")
u = urlparse(db_url)
user = unquote(u.username or 'postgres'); pw = unquote(u.password or '')
db = (u.path or '/').lstrip('/').split('?')[0] or 'postgres'

sql = ("SELECT to_char(created_at,'MM-DD HH24:MI') AS t, type, status, "
       "coalesce(left(error,160),'') AS err, \\\"to\\\" "
       "FROM email_logs ORDER BY created_at DESC LIMIT 12;")
cmd = "docker exec -e PGPASSWORD='%s' unity-postgres psql -U %s -d %s -c \"%s\"" % (pw, user, db, sql)
o, e = run(cmd)
print(o.rstrip())
if e.strip():
    print('[stderr]', e.strip()[:400])
ssh.close()
