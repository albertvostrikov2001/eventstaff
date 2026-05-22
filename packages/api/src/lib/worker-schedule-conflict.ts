import type { PrismaClient } from '@prisma/client';
import { ShiftStatus } from '@prisma/client';

export type ScheduleConflict = {
  date: string;
  shiftId: string;
  vacancyTitle: string | null;
  status: string;
};

const BOOKED_STATUSES: ShiftStatus[] = [
  ShiftStatus.PENDING,
  ShiftStatus.ACTIVE,
  ShiftStatus.DISPUTED,
  ShiftStatus.COMPLETED,
];

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Finds worker shifts that occupy the same calendar day as the target date. */
export async function findWorkerScheduleConflicts(
  prisma: PrismaClient,
  workerUserId: string,
  targetDate: Date,
): Promise<ScheduleConflict[]> {
  const dateKey = toDateKey(targetDate);

  const shifts = await prisma.shift.findMany({
    where: {
      workerId: workerUserId,
      status: { in: BOOKED_STATUSES },
    },
    include: {
      booking: {
        include: {
          linkedVacancy: { select: { title: true, dateStart: true } },
        },
      },
    },
  });

  const conflicts: ScheduleConflict[] = [];
  for (const shift of shifts) {
    const raw = shift.booking.linkedVacancy?.dateStart ?? shift.booking.date;
    if (!raw) continue;
    if (toDateKey(new Date(raw)) === dateKey) {
      conflicts.push({
        date: dateKey,
        shiftId: shift.id,
        vacancyTitle: shift.booking.linkedVacancy?.title ?? null,
        status: shift.status,
      });
    }
  }
  return conflicts;
}
