import { emailShell, escapeHtml } from '@/emails/brand';

export function invitationEmail(data: {
  vacancyTitle: string;
  employerName: string;
  eventDate: string;
  eventLocation: string;
  ctaUrl: string;
}): { subject: string; html: string } {
  const subject = 'Вас приглашают на вакансию';
  const body = `
    <p style="margin:0 0 16px 0;">Здравствуйте!</p>
    <p style="margin:0 0 16px 0;">
      <strong>${escapeHtml(data.employerName)}</strong> приглашает вас на смену:
      <strong>${escapeHtml(data.vacancyTitle)}</strong>.
    </p>
    <p style="margin:0 0 8px 0;"><strong>Дата:</strong> ${escapeHtml(data.eventDate)}</p>
    <p style="margin:0 0 16px 0;"><strong>Локация:</strong> ${escapeHtml(data.eventLocation)}</p>
  `;
  return {
    subject,
    html: emailShell({
      title: subject,
      bodyHtml: body,
      ctaLabel: 'Открыть приглашение',
      ctaUrl: data.ctaUrl,
    }),
  };
}
