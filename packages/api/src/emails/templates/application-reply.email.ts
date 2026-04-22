import { emailShell, escapeHtml } from '@/emails/brand';

export function applicationReplyEmail(data: {
  vacancyTitle: string;
  employerName: string;
  status: string;
  ctaUrl: string;
}): { subject: string; html: string } {
  const subject = 'Ответ на ваш отклик';
  const body = `
    <p style="margin:0 0 16px 0;"><strong>${escapeHtml(data.employerName)}</strong> обновил(а) статус вашего отклика на
    <strong>${escapeHtml(data.vacancyTitle)}</strong>.</p>
    <p style="margin:0 0 16px 0;"><strong>Статус:</strong> ${escapeHtml(data.status)}</p>
  `;
  return {
    subject,
    html: emailShell({
      title: subject,
      bodyHtml: body,
      ctaLabel: 'Открыть отклик',
      ctaUrl: data.ctaUrl,
    }),
  };
}
