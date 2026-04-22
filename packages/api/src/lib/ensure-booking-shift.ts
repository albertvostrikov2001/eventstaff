import type { PrismaClient } from '@prisma/client';
import { ShiftStatus } from '@prisma/client';

/**
 * Создаёт смену для заказа, если её ещё нет (связываем user id работника и работодателя).
 */
export async function ensureShiftForBooking(
  prisma: PrismaClient,
  bookingId: string,
): Promise<{ id: string }> {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      worker: { select: { userId: true } },
      employer: { select: { userId: true } },
    },
  });
  const workerUserId = booking.worker.userId;
  const employerUserId = booking.employer.userId;
  return prisma.shift.upsert({
    where: { bookingId_workerId: { bookingId, workerId: workerUserId } },
    create: {
      bookingId,
      workerId: workerUserId,
      employerId: employerUserId,
      status: ShiftStatus.PENDING,
    },
    update: {},
    select: { id: true },
  });
}
