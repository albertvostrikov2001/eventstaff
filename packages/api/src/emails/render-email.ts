import type { InAppNotificationType } from '@prisma/client';
import { emailShell, escapeHtml } from '@/emails/brand';
import { applicationReplyEmail } from '@/emails/templates/application-reply.email';
import { cancellationEmail } from '@/emails/templates/cancellation.email';
import { complaintEmail } from '@/emails/templates/complaint.email';
import { invitationEmail } from '@/emails/templates/invitation.email';
import { newApplicationEmail } from '@/emails/templates/new-application.email';
import { reviewEmail } from '@/emails/templates/review.email';
import { shiftReminderEmail } from '@/emails/templates/shift-reminder.email';
import { unpaidReminderEmail } from '@/emails/templates/unpaid-reminder.email';

export function renderEmailForType(
  type: InAppNotificationType,
  templateData: Record<string, unknown>,
): { subject: string; html: string } {
  const d = templateData as Record<string, string>;
  switch (type) {
    case 'INVITATION':
      return invitationEmail({
        vacancyTitle: d.vacancyTitle ?? '',
        employerName: d.employerName ?? '',
        eventDate: d.eventDate ?? '',
        eventLocation: d.eventLocation ?? '',
        ctaUrl: d.ctaUrl ?? '',
      });
    case 'CANCELLATION':
      return cancellationEmail({
        vacancyTitle: d.vacancyTitle ?? '',
        cancelledByRole: d.cancelledByRole ?? '',
        cancellationReason: d.cancellationReason ?? '',
        ctaUrl: d.ctaUrl ?? '',
      });
    case 'REVIEW_RECEIVED':
      return reviewEmail({
        reviewerName: d.reviewerName ?? '',
        overallScore: d.overallScore ?? '',
        comment: d.comment ?? '',
        ctaUrl: d.ctaUrl ?? '',
      });
    case 'COMPLAINT_UPDATE':
      return complaintEmail({
        id: d.id ?? '',
        complaintType: d.complaintType ?? '',
        authorRole: d.authorRole ?? '',
        description: d.description ?? '',
      });
    case 'APPLICATION_RECEIVED':
      return newApplicationEmail({
        workerName: d.workerName ?? '',
        vacancyTitle: d.vacancyTitle ?? '',
        workerProfile: d.workerProfile ?? '',
        ctaUrl: d.ctaUrl ?? '',
      });
    case 'APPLICATION_RESPONSE':
      return applicationReplyEmail({
        vacancyTitle: d.vacancyTitle ?? '',
        employerName: d.employerName ?? '',
        status: d.status ?? '',
        ctaUrl: d.ctaUrl ?? '',
      });
    case 'SHIFT_REMINDER':
      return shiftReminderEmail({
        vacancyTitle: d.vacancyTitle ?? '',
        location: d.location ?? '',
        startTime: d.startTime ?? '',
        ctaUrl: d.ctaUrl ?? '',
      });
    case 'PAYMENT_REQUIRED':
      return unpaidReminderEmail({
        workerName: d.workerName ?? '',
        amount: d.amount ?? '',
        shiftDate: d.shiftDate ?? '',
        ctaUrl: d.ctaUrl ?? '',
      });
    case 'PAYMENT_RECEIVED': {
      const title = 'Платёж на платформе Юнити';
      const msg = escapeHtml(String(d.body ?? 'Платёж обработан.'));
      return {
        subject: title,
        html: emailShell({
          title,
          bodyHtml: `<p style="margin:0 0 16px 0;">${msg}</p>
            ${d.ctaUrl ? `<p><a href="${escapeHtml(d.ctaUrl)}" style="color:#0d3b2a;font-weight:600;">Открыть в кабинете</a></p>` : ''}`,
        }),
      };
    }
    case 'INDIVIDUAL_REQUEST': {
      const title = 'Новая персональная заявка';
      const msg = escapeHtml(String(d.body ?? 'Новая заявка в админке.'));
      return {
        subject: title,
        html: emailShell({
          title,
          bodyHtml: `<p style="margin:0 0 12px 0;white-space:pre-wrap;">${msg}</p>
            ${d.ctaUrl ? `<p><a href="${escapeHtml(d.ctaUrl)}" style="color:#0d3b2a;font-weight:600;">Просмотреть заявку</a></p>` : ''}`,
        }),
      };
    }
    default: {
      const title = 'Уведомление Юнити';
      const msg = escapeHtml(String(d.body ?? 'Сообщение от платформы Юнити.'));
      return {
        subject: title,
        html: emailShell({
          title,
          bodyHtml: `<p style="margin:0;">${msg}</p>`,
        }),
      };
    }
  }
}
