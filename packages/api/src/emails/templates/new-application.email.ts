import { emailShell, escapeHtml } from '@/emails/brand';

export function newApplicationEmail(data: {
  workerName: string;
  vacancyTitle: string;
  workerProfile: string;
  ctaUrl: string;
}): { subject: string; html: string } {
  const subject = 'Новый отклик на вакансию';
  const body = `
    <p style="margin:0 0 16px 0;"><strong>${escapeHtml(data.workerName)}</strong> откликнулся(лась) на вакансию
    <strong>${escapeHtml(data.vacancyTitle)}</strong>.</p>
    <p style="margin:0 0 16px 0;">${escapeHtml(data.workerProfile)}</p>
  `;
  return {
    subject,
    html: emailShell({
      title: subject,
      bodyHtml: body,
      ctaLabel: 'Посмотреть отклик',
      ctaUrl: data.ctaUrl,
    }),
  };
}
