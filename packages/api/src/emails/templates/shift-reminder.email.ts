import { emailShell, escapeHtml } from '@/emails/brand';

export function shiftReminderEmail(data: {
  vacancyTitle: string;
  location: string;
  startTime: string;
  ctaUrl: string;
}): { subject: string; html: string } {
  const subject = 'Напоминание о смене через 2 часа';
  const body = `
    <p style="margin:0 0 16px 0;">Напоминаем: скоро начинается смена по вакансии <strong>${escapeHtml(data.vacancyTitle)}</strong>.</p>
    <p style="margin:0 0 8px 0;"><strong>Время начала:</strong> ${escapeHtml(data.startTime)}</p>
    <p style="margin:0 0 16px 0;"><strong>Локация:</strong> ${escapeHtml(data.location)}</p>
  `;
  return {
    subject,
    html: emailShell({
      title: subject,
      bodyHtml: body,
      ctaLabel: 'Открыть смену',
      ctaUrl: data.ctaUrl,
    }),
  };
}
