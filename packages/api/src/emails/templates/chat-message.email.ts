import { emailShell, escapeHtml } from '@/emails/brand';

export function chatMessageEmail(data: {
  senderName: string;
  messagePreview: string;
  ctaUrl: string;
}): { subject: string; html: string } {
  const subject = `Новое сообщение от ${data.senderName}`;
  const preview = data.messagePreview.length > 200
    ? data.messagePreview.slice(0, 200) + '…'
    : data.messagePreview;

  const body = `
    <p style="margin:0 0 16px 0;">Здравствуйте!</p>
    <p style="margin:0 0 16px 0;">
      <strong>${escapeHtml(data.senderName)}</strong> написал(а) вам новое сообщение:
    </p>
    <blockquote style="margin:0 0 20px 0;padding:12px 16px;border-left:3px solid #059669;background:#f9fafb;border-radius:4px;font-style:italic;color:#374151;">
      ${escapeHtml(preview)}
    </blockquote>
    <p style="margin:0 0 16px 0;font-size:13px;color:#6b7280;">
      Если вы уже видели это сообщение, просто проигнорируйте письмо.
    </p>
  `;

  return {
    subject,
    html: emailShell({
      title: 'Новое сообщение в чате',
      previewText: `${data.senderName}: ${preview}`,
      bodyHtml: body,
      ctaLabel: 'Открыть чат',
      ctaUrl: data.ctaUrl,
    }),
  };
}
