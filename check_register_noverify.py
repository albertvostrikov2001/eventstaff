# -*- coding: utf-8 -*-
"""Смоук-тест: регистрация по email логинит сразу (без верификации), логин проходит.
Создаёт ОДИН одноразовый аккаунт и тут же его удаляет (само-очистка)."""
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

JS = r'''
require('dotenv').config({ path: '/opt/unity/.env' });
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const BASE = 'http://127.0.0.1:4000/api/v1';
const email = 'smoke_noverify_' + Date.now() + '@example.com';
const password = 'SmokeTest123!';
(async () => {
  let createdId = null;
  try {
    // 1) Регистрация по email
    const reg = await fetch(BASE + '/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'worker', consentGiven: true, isAdult: true }),
    });
    const regJson = await reg.json();
    console.log('REGISTER http=' + reg.status);
    console.log('  вернулся user:', !!regJson.data?.user, '| pendingUserId (должно НЕТ):', regJson.data?.pendingUserId ?? 'нет');
    const setCookie = reg.headers.get('set-cookie') || '';
    console.log('  выданы куки (access_token):', setCookie.includes('access_token'));

    const u = await p.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
    createdId = u?.id ?? null;
    console.log('  в БД: emailVerified =', u?.emailVerified, '(ожидаем false — но вход всё равно работает)');

    // 2) Логин теми же кредами — не должно быть EMAIL_NOT_VERIFIED
    const log = await fetch(BASE + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: email, password }),
    });
    const logJson = await log.json();
    console.log('LOGIN http=' + log.status);
    console.log('  вернулся user:', !!logJson.data?.user, '| код ошибки:', logJson.error?.code ?? 'нет');
  } catch (e) {
    console.error('ERR', e.message);
  } finally {
    // Само-очистка: удаляем одноразовый аккаунт (профиль/роли/настройки уйдут каскадом)
    if (createdId) {
      await p.user.delete({ where: { id: createdId } }).catch(()=>{});
      console.log('CLEANUP: одноразовый аккаунт удалён');
    } else {
      await p.user.deleteMany({ where: { email } }).catch(()=>{});
      console.log('CLEANUP: попытка удалить по email');
    }
    await p.$disconnect();
  }
})();
'''
sftp = ssh.open_sftp()
with sftp.open('/opt/unity/packages/api/_smoke.js', 'w') as f:
    f.write(JS)
sftp.close()
_, o, e = ssh.exec_command('cd /opt/unity/packages/api && node _smoke.js', timeout=60)
print(o.read().decode('utf-8', 'replace'))
er = e.read().decode('utf-8', 'replace')
if er.strip():
    print('[stderr]', er.strip()[:400])
ssh.exec_command('rm -f /opt/unity/packages/api/_smoke.js')
ssh.close()
print('Done.')
