import { publicSiteUrl } from '@/lib/public-site-url';

const HEADER_BG = '#0d1f17';
const EMERALD = '#059669';
const EMERALD2 = '#10b981';

export function emailShell(params: {
  title: string;
  previewText?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export { escapeHtml };
