# -*- coding: utf-8 -*-
"""Read-only диагностика: почему сайт периодически не открывается (особенно мобильные)."""
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

def run(label, cmd, t=40):
    print(f"\n===== {label} =====")
    _, o, e = ssh.exec_command(cmd, timeout=t)
    out = o.read().decode('utf-8', 'replace')
    err = e.read().decode('utf-8', 'replace')
    print(out.strip() or '(пусто)')
    if err.strip():
        print('[stderr]', err.strip()[:400])

run('pm2 status (рестарты/память/uptime)',
    'pm2 jlist 2>/dev/null | node -e "let d=\'\';process.stdin.on(\'data\',c=>d+=c).on(\'end\',()=>{try{JSON.parse(d).forEach(p=>console.log((p.name||\'?\').padEnd(14), \'status=\'+p.pm2_env.status, \'restarts=\'+p.pm2_env.restart_time, \'mem=\'+Math.round((p.monit.memory||0)/1048576)+\'MB\', \'cpu=\'+p.monit.cpu+\'%\', \'uptime_h=\'+Math.round((Date.now()-p.pm2_env.pm_uptime)/3600000)))}catch(e){console.log(\'parse err\',e.message)}})"')

run('Память и swap', 'free -m')
run('Нагрузка / аптайм', 'uptime')
run('Диск', 'df -h / | tail -2')
run('OOM-killer в dmesg (если есть)', 'dmesg 2>/dev/null | grep -iE "killed process|out of memory" | tail -5 || echo "(нет доступа к dmesg или пусто)"')

run('Конфиг nginx (домен)',
    'cat /etc/nginx/sites-enabled/* 2>/dev/null | grep -vE "^\\s*#" | sed -n "1,200p"')

run('Версия nginx / http2', 'nginx -V 2>&1 | tr " " "\\n" | grep -iE "http_v2|nginx version" | head -5')

run('nginx error.log (хвост, важное)',
    'tail -120 /var/log/nginx/error.log 2>/dev/null | grep -iE "timed out|timeout|upstream|refused|reset|worker|SSL|handshake|too many|limit" | tail -30 || echo "(нет совпадений)"')

run('nginx access.log — коды ответов за последние строки',
    'tail -2000 /var/log/nginx/access.log 2>/dev/null | awk \'{print $9}\' | sort | uniq -c | sort -rn | head -15 || echo "(нет лога)"')

run('TLS-сертификат — срок',
    'echo | openssl s_client -servername unityevent.ru -connect 127.0.0.1:443 2>/dev/null | openssl x509 -noout -dates -subject 2>/dev/null || echo "(не удалось)"')

run('pm2 logs unity-web — ошибки',
    'pm2 logs unity-web --nostream --lines 200 2>/dev/null | grep -iE "error|unhandled|ECONN|timeout|EADDR|memory|fatal" | tail -20 || echo "(нет)"')

run('pm2 logs unity-api — ошибки',
    'pm2 logs unity-api --nostream --lines 200 2>/dev/null | grep -iE "error|unhandled|ECONN|timeout|chatNsp|fatal|listen" | tail -20 || echo "(нет)"')

run('Слушающие порты', 'ss -ltnp 2>/dev/null | grep -E ":(80|443|3000|4000)" || netstat -ltnp 2>/dev/null | grep -E ":(80|443|3000|4000)"')

ssh.close()
print('\nDone.')
