import { emailShell, escapeHtml } from '@/emails/brand';

export function unpaidReminderEmail(data: {
  workerName: string;
  amount: string;
  shiftDate: string;
  ctaUrl: string;
}): { subject: string; html: string } {
  const subject = 'Не забудьте оплатить работу';
  const body = `
    <p style="margin:0 0 16px 0;">Смена с <strong>${escapeHtml(data.workerName)}</strong> завершена, ожидается оплата.</p>
    <p style="margin:0 0 8px 0;"><strong>Сумма:</strong> ${escapeHtml(data.amount)}</p>
    <p style="margin:0 0 16px 0;"><strong>Дата смены:</strong> ${escapeHtml(data.shiftDate)}</p>
  `;
  return {
    subject,
    html: emailShell({
      title: subject,
      bodyHtml: body,
      ctaLabel: 'Перейти к оплате',
      ctaUrl: data.ctaUrl,
    }),
  };
}
