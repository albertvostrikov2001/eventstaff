import type { Shift, PrismaClient } from '@prisma/client';
import { ShiftStatus } from '@prisma/client';
import { ReliabilityService } from '@/services/reliability-service';
import type { NotificationService } from '@/services/notification-service';
import { publicSiteUrl } from '@/lib/public-site-url';

// Завершение смены (двусторонняя приёмка результата) доступно только когда смена уже идёт.
const canConfirmStatuses: ShiftStatus[] = [
  ShiftStatus.ACTIVE,
  ShiftStatus.DISPUTED,
];

export class ShiftConfirmationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly messageRu: string,
  ) {
    super(messageRu);
    this.name = 'ShiftConfirmationError';
  }
}

type Deps = {
  prisma: PrismaClient;
  notificationService: NotificationService;
};

/**
 * Принятие назначенной смены (фаза до проведения).
 * Работник (или работодатель) подтверждает, что выйдет на смену.
 * Когда работник принял — смена становится ACTIVE.
 */
export async function acceptShift(
  deps: Deps,
  shiftId: string,
  actorUserId: string,
): Promise<Shift> {
  const { prisma, notificationService } = deps;

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { booking: { include: { linkedVacancy: true } } },
  });
  if (!shift) {
    throw new ShiftConfirmationError(404, 'NOT_FOUND', 'Смена не найдена');
  }
  if (shift.status !== ShiftStatus.PENDING) {
    throw new ShiftConfirmationError(400, 'INVALID_STATE', 'Смену уже нельзя принять');
  }
  const isWorker = shift.workerId === actorUserId;
  const isEmployer = shift.employerId === actorUserId;
  if (!isWorker && !isEmployer) {
    throw new ShiftConfirmationError(403, 'FORBIDDEN', 'Нет доступа');
  }

  const now = new Date();
  const updated = isWorker
    ? await prisma.shift.update({
        where: { id: shiftId },
        data: { workerAccepted: true, workerAcceptedAt: now },
      })
    : await prisma.shift.update({
        where: { id: shiftId },
        data: { employerAccepted: true, employerAcceptedAt: now },
      });

  // Notify the other party
  const otherId = isWorker ? shift.employerId : shift.workerId;
  await notificationService.create({
    userId: otherId,
    type: 'SHIFT_COMPLETED',
    title: isWorker ? 'Работник принял смену' : 'Работодатель подтвердил смену',
    body: 'Смена подтверждена и активна.',
    data: { shiftId, bookingId: shift.bookingId },
  });

  // Worker acceptance activates the shift (employer already committed by confirming the application)
  if (updated.workerAccepted) {
    return prisma.shift.update({
      where: { id: shiftId },
      data: { status: ShiftStatus.ACTIVE },
    });
  }
  return updated;
}

/** Shared логика подтверждения участия смены (рабочее или работодатель) */
export async function confirmShiftParticipation(
  deps: Deps,
  shiftId: string,
  actorUserId: string,
): Promise<Shift> {
  const { prisma, notificationService } = deps;

  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { booking: { include: { linkedVacancy: true } } },
  });
  if (!shift) {
    throw new ShiftConfirmationError(404, 'NOT_FOUND', 'Смена не найдена');
  }
  if (!canConfirmStatuses.includes(shift.status)) {
    throw new ShiftConfirmationError(400, 'INVALID_STATE', 'Смена не может быть подтверждена');
  }
  const isWorker = shift.workerId === actorUserId;
  const isEmployer = shift.employerId === actorUserId;
  if (!isWorker && !isEmployer) {
    throw new ShiftConfirmationError(403, 'FORBIDDEN', 'Нет доступа');
  }
  const now = new Date();
  const res = isWorker
    ? await prisma.shift.update({
        where: { id: shiftId },
        data: { workerConfirmed: true, workerConfirmedAt: now },
      })
    : await prisma.shift.update({
        where: { id: shiftId },
        data: { employerConfirmed: true, employerConfirmedAt: now },
      });

  const otherId = isWorker ? shift.employerId : shift.workerId;
  const title = isWorker
    ? 'Работник подтвердил завершение смены'
    : 'Работодатель подтвердил завершение смены';
  await notificationService.create({
    userId: otherId,
    type: 'SHIFT_COMPLETED',
    title,
    body: 'Подтвердите завершение, если согласны.',
    data: { shiftId, bookingId: shift.bookingId },
  });

  if (res.workerConfirmed && res.employerConfirmed) {
    const completed = await prisma.shift.update({
      where: { id: shiftId },
      data: { status: ShiftStatus.COMPLETED, completedAt: new Date() },
    });
    const rel = new ReliabilityService(prisma, notificationService);
    await rel.recalculate(shift.workerId);
    await rel.recalculate(shift.employerId);
    const site = publicSiteUrl();
    await notificationService.create({
      userId: shift.workerId,
      type: 'SHIFT_COMPLETED',
      title: 'Смена завершена',
      body: 'Оцените работодателя в течение 72 часов.',
      data: { shiftId, ctaUrl: `${site}/worker/reviews?shift=${shiftId}` },
    });
    await notificationService.create({
      userId: shift.employerId,
      type: 'SHIFT_COMPLETED',
      title: 'Смена завершена',
      body: 'Оцените исполнителя в течение 72 часов.',
      data: { shiftId, ctaUrl: `${site}/employer/reviews?shift=${shiftId}` },
    });
    return completed;
  }

  return res;
}
