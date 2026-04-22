import { emailShell, escapeHtml } from '@/emails/brand';

export function cancellationEmail(data: {
  vacancyTitle: string;
  cancelledByRole: string;
  cancellationReason: string;
  ctaUrl: string;
}): { subject: string; html: string } {
  const subject = 'Смена отменена';
  const body = `
    <p style="margin:0 0 16px 0;">Смена по вакансии <strong>${escapeHtml(data.vacancyTitle)}</strong> была отменена.</p>
    <p style="margin:0 0 8px 0;"><strong>Кто отменил:</strong> ${escapeHtml(data.cancelledByRole)}</p>
    <p style="margin:0 0 16px 0;"><strong>Причина:</strong> ${escapeHtml(data.cancellationReason)}</p>
  `;
  return {
    subject,
    html: emailShell({
      title: subject,
      bodyHtml: body,
      ctaLabel: 'Подробности в кабинете',
      ctaUrl: data.ctaUrl,
    }),
  };
}
