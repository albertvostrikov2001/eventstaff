import type { PrismaClient } from '@prisma/client';
import { ApplicationStatus, BookingStatus, ShiftStatus } from '@prisma/client';

const LINK_APPLICATION: ApplicationStatus[] = [
  ApplicationStatus.invited,
  ApplicationStatus.interview,
  ApplicationStatus.confirmed,
  ApplicationStatus.shift_started,
  ApplicationStatus.completed,
];

const LINK_BOOKING: BookingStatus[] = [BookingStatus.pending, BookingStatus.confirmed];

const LINK_SHIFT: ShiftStatus[] = [
  ShiftStatus.PENDING,
  ShiftStatus.ACTIVE,
  ShiftStatus.DISPUTED,
];

export type WorkerEmployerIds = { workerId: string; employerId: string };

export function resolveWorkerEmployerPair(
  a: { workerProfile: { id: string } | null; employerProfile: { id: string } | null },
  b: { workerProfile: { id: string } | null; employerProfile: { id: string } | null },
): WorkerEmployerIds | null {
  if (a.workerProfile && b.employerProfile) {
    return { workerId: a.workerProfile.id, employerId: b.employerProfile.id };
  }
  if (a.employerProfile && b.workerProfile) {
    return { workerId: b.workerProfile.id, employerId: a.employerProfile.id };
  }
  return null;
}

export async function hasLinkingContext(
  prisma: PrismaClient,
  pair: WorkerEmployerIds,
): Promise<boolean> {
  const appLink = await prisma.application.findFirst({
    where: {
      workerId: pair.workerId,
      status: { in: LINK_APPLICATION },
      vacancy: { employerId: pair.employerId },
    },
  });
  if (appLink) return true;

  const bookingLink = await prisma.booking.findFirst({
    where: {
      workerId: pair.workerId,
      employerId: pair.employerId,
      status: { in: LINK_BOOKING },
    },
  });
  if (bookingLink) return true;

  const [wp, ep] = await Promise.all([
    prisma.workerProfile.findUnique({
      where: { id: pair.workerId },
      select: { userId: true },
    }),
    prisma.employerProfile.findUnique({
      where: { id: pair.employerId },
      select: { userId: true },
    }),
  ]);
  if (!wp || !ep) return false;

  const shiftLink = await prisma.shift.findFirst({
    where: {
      workerId: wp.userId,
      employerId: ep.userId,
      status: { in: LINK_SHIFT },
    },
  });
  return !!shiftLink;
}

export async function canChat(
  prisma: PrismaClient,
  userId: string,
  recipientId: string,
): Promise<boolean> {
  if (userId === recipientId) return false;

  const [u1, u2] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { workerProfile: { select: { id: true } }, employerProfile: { select: { id: true } } },
    }),
    prisma.user.findUnique({
      where: { id: recipientId },
      include: { workerProfile: { select: { id: true } }, employerProfile: { select: { id: true } } },
    }),
  ]);
  if (!u1 || !u2) return false;

  const pair = resolveWorkerEmployerPair(u1, u2);
  if (!pair) return false;

  return hasLinkingContext(prisma, pair);
}

/**
 * If users may chat, returns ordered worker/employer profile ids for ChatRoom.
 */
export async function resolveChatPair(
  prisma: PrismaClient,
  userId: string,
  recipientId: string,
): Promise<WorkerEmployerIds | null> {
  if (userId === recipientId) return null;

  const [u1, u2] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { workerProfile: { select: { id: true } }, employerProfile: { select: { id: true } } },
    }),
    prisma.user.findUnique({
      where: { id: recipientId },
      include: { workerProfile: { select: { id: true } }, employerProfile: { select: { id: true } } },
    }),
  ]);
  if (!u1 || !u2) return null;

  const pair = resolveWorkerEmployerPair(u1, u2);
  if (!pair) return null;
  if (!(await hasLinkingContext(prisma, pair))) return null;
  return pair;
}
