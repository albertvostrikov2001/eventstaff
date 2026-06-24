import { emailShell, escapeHtml } from '@/emails/brand';

export function emailVerificationEmail(data: {
  verifyUrl?: string;
  code?: string;
  email: string;
}): { subject: string; html: string } {
  const subject = 'Подтвердите почту на платформе Юнити';
  const verifyUrl = (data.verifyUrl ?? '').trim();
  const body = `
    <p style="margin:0 0 16px 0;">Здравствуйте!</p>
    <p style="margin:0 0 16px 0;">
      Спасибо, что присоединились к Юнити. Чтобы завершить регистрацию, подтвердите
      адрес <strong>${escapeHtml(data.email)}</strong> — нажмите кнопку ниже.
    </p>
    <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">
      Кнопка не открывается? Скопируйте ссылку в адресную строку браузера:
    </p>
    <p style="margin:0 0 16px 0;font-size:13px;word-break:break-all;">
      <a href="${escapeHtml(verifyUrl)}" style="color:#059669;">${escapeHtml(verifyUrl)}</a>
    </p>
    <p style="margin:0 0 16px 0;font-size:14px;color:#6b7280;">
      Ссылка действует 24 часа. Если вы не создавали аккаунт на Юнити —
      просто не отвечайте на это письмо, с вашими данными ничего не произойдёт.
    </p>
    <p style="margin:0;font-size:14px;color:#374151;">
      Хорошего дня,<br/>команда Юнити
    </p>
  `;
  return {
    subject,
    html: emailShell({
      title: 'Подтверждение почты',
      previewText: 'Подтвердите адрес почты на Юнити',
      bodyHtml: body,
      ctaLabel: 'Подтвердить почту',
      ctaUrl: verifyUrl,
    }),
  };
}
