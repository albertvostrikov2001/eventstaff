# -*- coding: utf-8 -*-
import os, sys, paramiko
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
for line in (Path(__file__).parent / '.env.deploy').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, _, v = line.partition('='); os.environ.setdefault(k.strip(), v.strip())
ssh = paramiko.SSHClient(); ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.environ.get('DEPLOY_HOST', '147.45.235.70'), port=22,
            username='root', password=os.environ.get('DEPLOY_PASS', ''), timeout=30)
# Tail the error log, strip non-ascii to avoid local console issues.
cmd = "tail -n 60 /root/.pm2/logs/unity-web-error.log 2>/dev/null | tr -cd '\\11\\12\\15\\40-\\176'"
_, o, e = ssh.exec_command(cmd)
print(o.read().decode('utf-8', 'replace'))
ssh.close()
