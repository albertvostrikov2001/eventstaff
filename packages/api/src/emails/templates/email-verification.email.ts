import { emailShell, escapeHtml } from '@/emails/brand';

export function emailVerificationEmail(data: {
  code: string;
  email: string;
}): { subject: string; html: string } {
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
