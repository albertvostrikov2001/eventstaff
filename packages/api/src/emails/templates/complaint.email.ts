import { emailShell, escapeHtml } from '@/emails/brand';
import { publicSiteUrl } from '@/lib/public-site-url';

export function complaintEmail(data: {
  id: string;
  complaintType: string;
  authorRole: string;
  description: string;
}): { subject: string; html: string } {
  const subject = `Новая жалоба #${data.id}`;
  const body = `
    <p style="margin:0 0 8px 0;"><strong>Тип:</strong> ${escapeHtml(data.complaintType)}</p>
    <p style="margin:0 0 8px 0;"><strong>Автор (роль):</strong> ${escapeHtml(data.authorRole)}</p>
    <p style="margin:0 0 0 0;"><strong>Описание:</strong></p>
    <p style="margin:8px 0 16px 0;white-space:pre-wrap;">${escapeHtml(data.description)}</p>
  `;
  return {
    subject,
    html: emailShell({
      title: subject,
      bodyHtml: body,
      ctaLabel: 'Открыть админку',
      ctaUrl: `${publicSiteUrl()}/admin/dashboard`,
    }),
  };
}
