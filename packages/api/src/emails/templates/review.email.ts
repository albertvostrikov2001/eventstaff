import { emailShell, escapeHtml } from '@/emails/brand';

export function reviewEmail(data: {
  reviewerName: string;
  overallScore: string;
  comment: string;
  ctaUrl: string;
}): { subject: string; html: string } {
  const subject = 'Вы получили оценку';
  const commentBlock = data.comment
    ? `<p style="margin:0 0 16px 0;"><strong>Комментарий:</strong> ${escapeHtml(data.comment)}</p>`
    : '';
  const body = `
    <p style="margin:0 0 16px 0;"><strong>${escapeHtml(data.reviewerName)}</strong> оставил(а) вам оценку.</p>
    <p style="margin:0 0 16px 0;"><strong>Балл:</strong> ${escapeHtml(data.overallScore)}</p>
    ${commentBlock}
  `;
  return {
    subject,
    html: emailShell({
      title: subject,
      bodyHtml: body,
      ctaLabel: 'Посмотреть отзыв',
      ctaUrl: data.ctaUrl,
    }),
  };
}
