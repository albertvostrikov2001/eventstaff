import type { PrismaClient } from '@prisma/client';
import { ShiftStatus } from '@prisma/client';
import type { NotificationService } from '@/services/notification-service';
import { publicSiteUrl } from '@/lib/public-site-url';

/**
 * Одна сторона подтвердила завершение, вторая — нет: через 48 ч уведомляем админов (однократно).
 */
export async function processStaleShiftConfirmations(
  prisma: PrismaClient,
  notifications: NotificationService,
): Promise<number> {
  const deadline = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const candidates = await prisma.shift.findMany({
    where: {
      status: { in: [ShiftStatus.ACTIVE, ShiftStatus.PENDING] },
      staleConfirmNotified: false,
      OR: [
        {
          workerConfirmed: true,
          employerConfirmed: false,
          workerConfirmedAt: { not: null, lte: deadline },
        },
        {
          employerConfirmed: true,
          workerConfirmed: false,
          employerConfirmedAt: { not: null, lte: deadline },
        },
      ],
    },
  });
  if (candidates.length === 0) return 0;
  const admin = await prisma.user.findFirst({
    where: { roles: { some: { role: 'admin' } } },
    select: { id: true },
  });
  if (!admin) return 0;
  const site = publicSiteUrl();
  let n = 0;
  for (const s of candidates) {
    await prisma.$transaction([
      prisma.shift.update({
        where: { id: s.id },
        data: { staleConfirmNotified: true },
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'shift.confirmation_stale',
          entityType: 'shift',
          entityId: s.id,
          details: {
            message: 'Одна сторона подтвердила завершение, вторая не ответила 48ч',
          },
        },
      }),
    ]);
    const admins = await prisma.user.findMany({
      where: { roles: { some: { role: 'admin' } } },
      select: { id: true },
    });
    for (const a of admins) {
      await notifications.create({
        userId: a.id,
        type: 'SYSTEM',
        title: 'Смена: требуется вмешательство',
        body: `Смена ${s.id.slice(0, 8)}: подтверждение с одной стороны, ответа нет 48 ч. Откройте консоль админа.`,
        data: { shiftId: s.id, escalation: true, ctaUrl: `${site}/admin/shifts` },
      });
    }
    n += 1;
  }
  return n;
}
