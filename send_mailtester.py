"""
Отправляет на mail-tester.com письмо, идентичное реальному письму с кодом
подтверждения (EMAIL_VERIFICATION): тот же HTML (brand shell + шаблон),
тот же From и тот же SMTP-транспорт из /opt/unity/.env.
Без записи в БД, без изменений на сервере — одна отправка.
Run: python send_mailtester.py
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

TO = os.environ.get('RECIPIENT', 'test-j7c4sa74w@srv1.mail-tester.com')

JS = r'''
const path = require('node:path');
require('dotenv').config({ path: '/opt/unity/.env' });
const nodemailer = require('nodemailer');

// ---- точная копия publicSiteUrl() ----
function publicSiteUrl() {
  const raw = (process.env.SITE_URL && process.env.SITE_URL.trim())
    || (process.env.PUBLIC_SITE_URL && process.env.PUBLIC_SITE_URL.trim())
    || (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim());
  if (raw) return raw.replace(/\/$/, '');
  return 'http://localhost:3000';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- точная копия emailShell() из brand.ts ----
const HEADER_BG = '#0d1f17';
const EMERALD = '#059669';
const EMERALD2 = '#10b981';
function emailShell(params) {
  const site = publicSiteUrl();
  const logoUrl = `${site}/logo.svg`;
  const prefsUrl = `${site}/dashboard/settings/notifications`;
  const ctaBlock =
    params.ctaLabel && params.ctaUrl
      ? `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto;">
    <tr>
      <td style="border-radius:8px;background:linear-gradient(135deg, ${EMERALD} 0%, ${EMERALD2} 100%);">
        <a href="${params.ctaUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
          ${params.ctaLabel}
        </a>
      </td>
    </tr>
  </table>`
      : '';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(params.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@600&display=swap" rel="stylesheet" />
  <style>
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; padding: 16px !important; }
      .h1 { font-size: 22px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(params.previewText ?? params.title)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(13,31,23,0.08);">
          <tr>
            <td style="background:${HEADER_BG};padding:20px 24px;text-align:center;">
              <img src="${logoUrl}" alt="Юнити" width="120" height="auto" style="display:inline-block;max-width:140px;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px 28px;font-family:'Playfair Display',Georgia,serif;" class="h1">
              <h1 style="margin:0;font-size:26px;line-height:1.25;color:#0d1f17;font-weight:600;">${escapeHtml(params.title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px 28px;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#374151;">
              ${params.bodyHtml}
              ${ctaBlock}
              <p style="margin:24px 0 0 0;font-size:13px;color:#6b7280;">
                <a href="${prefsUrl}" style="color:${EMERALD};text-decoration:underline;">Настройки уведомлений и рассылки</a>
              </p>
              <p style="margin:12px 0 0 0;font-size:12px;color:#9ca3af;">
                Это письмо отправлено автоматически, отвечать на него не нужно.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---- точная копия emailVerificationEmail() ----
function emailVerificationEmail(data) {
  const subject = 'Подтверждение email — Юнити';
  const body = `
    <p style="margin:0 0 16px 0;">Здравствуйте!</p>
    <p style="margin:0 0 16px 0;">
      Вы регистрируетесь на платформе <strong>Юнити</strong>. Введите код подтверждения
      на странице регистрации:
    </p>
    <div style="margin:24px 0;text-align:center;">
      <span style="display:inline-block;letter-spacing:10px;font-size:36px;font-weight:700;font-family:monospace;color:#0d1f17;background:#f0fdf4;border:2px solid #059669;border-radius:12px;padding:16px 28px;user-select:all;">
        ${escapeHtml(data.code)}
      </span>
    </div>
    <p style="margin:0 0 16px 0;padding:12px 16px;background:#fef3c7;border-radius:8px;font-size:13px;color:#92400e;">
      ⏱ Код действителен <strong>10 минут</strong>.
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280;">
      Если вы не регистрировались на платформе Юнити — проигнорируйте это письмо.
    </p>
  `;
  return {
    subject,
    html: emailShell({
      title: 'Подтверждение регистрации',
      previewText: `Ваш код подтверждения: ${data.code}`,
      bodyHtml: body,
    }),
  };
}

// ---- From (точная копия fromHeader()) ----
function fromHeader() {
  const name = (process.env.RESEND_FROM_NAME && process.env.RESEND_FROM_NAME.trim())
    || (process.env.SMTP_FROM_NAME && process.env.SMTP_FROM_NAME.trim())
    || 'Юнити';
  const email = (process.env.RESEND_FROM_EMAIL && process.env.RESEND_FROM_EMAIL.trim())
    || (process.env.SMTP_FROM_EMAIL && process.env.SMTP_FROM_EMAIL.trim())
    || (process.env.EMAIL_FROM && process.env.EMAIL_FROM.trim())
    || (process.env.SMTP_USER && process.env.SMTP_USER.trim())
    || '';
  return `${name} <${email}>`;
}

// ---- SMTP-транспорт (точная копия buildSmtpTransporter()) ----
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE !== 'false',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls: { rejectUnauthorized: false },
});

const TO = process.env.RECIPIENT || 'test-j7c4sa74w@srv1.mail-tester.com';
const code = '482917'; // реалистичный 6-значный код
const { subject, html } = emailVerificationEmail({ code, email: TO });
const from = fromHeader();

(async () => {
  try {
    await transporter.verify();
    console.log('SMTP verify: OK');
    const info = await transporter.sendMail({ from, to: TO, subject, html });
    console.log('FROM:    ' + from);
    console.log('SUBJECT: ' + subject);
    console.log('SITE:    ' + publicSiteUrl());
    console.log('TO:      ' + TO);
    console.log('SENT messageId=' + info.messageId);
    console.log('response: ' + (info.response || ''));
  } catch (e) {
    console.error('SEND ERROR: ' + e.message);
    process.exit(1);
  }
})();
'''


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f'Connecting to {HOST}:{PORT} ...')
    ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
    print('Connected.\n')

    sftp = ssh.open_sftp()
    with sftp.open('/opt/unity/packages/api/_mailtester.js', 'w') as f:
        f.write(JS)
    sftp.close()

    print('== verify + send identical EMAIL_VERIFICATION to mail-tester ==')
    _, o, e = ssh.exec_command('cd /opt/unity/packages/api && node _mailtester.js', timeout=180)
    print(o.read().decode('utf-8', 'replace'))
    er = e.read().decode('utf-8', 'replace')
    if er.strip():
        print('[stderr]', er)

    ssh.exec_command('rm -f /opt/unity/packages/api/_mailtester.js')
    ssh.close()
    print('\nDone.')


if __name__ == '__main__':
    main()
