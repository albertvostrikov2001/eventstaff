import {
  ApplicationStatus,
  ChatRoomContextType,
  type PrismaClient,
} from '@prisma/client';
import type { WorkerEmployerIds } from '@/lib/can-chat';

export class InvalidChatContextError extends Error {
  constructor() {
    super('INVALID_CONTEXT');
  }
}

export type OpenChatContextPayload =
  | { type: 'GENERAL' }
  | { type: 'APPLICATION'; id: string }
  | { type: 'INVITATION'; id: string }
  | { type: 'SHIFT'; id: string }
  | { type: 'VACANCY'; id: string };

export async function normalizeAndValidateOpenContext(
  prisma: PrismaClient,
  pair: WorkerEmployerIds,
  body?: OpenChatContextPayload | null,
): Promise<{ contextType: ChatRoomContextType; contextId: string | null }> {
  const raw: OpenChatContextPayload = body ?? { type: 'GENERAL' };

  switch (raw.type) {
    case 'GENERAL':
      return { contextType: ChatRoomContextType.GENERAL, contextId: null };
    case 'APPLICATION': {
      const app = await prisma.application.findFirst({
        where: {
          id: raw.id,
          workerId: pair.workerId,
          vacancy: { employerId: pair.employerId },
        },
        include: { vacancy: { select: { title: true } } },
      });
      if (!app) throw new InvalidChatContextError();
      return { contextType: ChatRoomContextType.APPLICATION, contextId: app.id };
    }
    case 'INVITATION': {
      const app = await prisma.application.findFirst({
        where: {
          id: raw.id,
          workerId: pair.workerId,
          status: ApplicationStatus.invited,
          vacancy: { employerId: pair.employerId },
        },
      });
      if (!app) throw new InvalidChatContextError();
      return { contextType: ChatRoomContextType.INVITATION, contextId: app.id };
    }
    case 'VACANCY': {
      const v = await prisma.vacancy.findFirst({
        where: { id: raw.id, employerId: pair.employerId },
      });
      if (!v) throw new InvalidChatContextError();
      const app = await prisma.application.findFirst({
        where: { workerId: pair.workerId, vacancyId: raw.id },
      });
      if (!app) throw new InvalidChatContextError();
      return { contextType: ChatRoomContextType.VACANCY, contextId: v.id };
    }
    case 'SHIFT': {
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
      if (!wp || !ep) throw new InvalidChatContextError();
      const shift = await prisma.shift.findFirst({
        where: {
          id: raw.id,
          workerId: wp.userId,
          employerId: ep.userId,
        },
      });
      if (!shift) throw new InvalidChatContextError();
      return { contextType: ChatRoomContextType.SHIFT, contextId: shift.id };
    }
    default:
      throw new InvalidChatContextError();
  }
}

export async function suggestOpenContextForPair(
  prisma: PrismaClient,
  pair: WorkerEmployerIds,
): Promise<{ contextType: ChatRoomContextType; contextId: string | null }> {
  const app = await prisma.application.findFirst({
    where: { workerId: pair.workerId, vacancy: { employerId: pair.employerId } },
    orderBy: { updatedAt: 'desc' },
  });
  if (app?.status === ApplicationStatus.invited) {
    return { contextType: ChatRoomContextType.INVITATION, contextId: app.id };
  }
  if (app) {
    return { contextType: ChatRoomContextType.APPLICATION, contextId: app.id };
  }
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
  if (!wp || !ep) {
    return { contextType: ChatRoomContextType.GENERAL, contextId: null };
  }
  const shift = await prisma.shift.findFirst({
    where: { workerId: wp.userId, employerId: ep.userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });
  if (shift) {
    return { contextType: ChatRoomContextType.SHIFT, contextId: shift.id };
  }
  return { contextType: ChatRoomContextType.GENERAL, contextId: null };
}

export async function buildSystemOpeningText(
  prisma: PrismaClient,
  pair: WorkerEmployerIds,
  normalized: { contextType: ChatRoomContextType; contextId: string | null },
): Promise<string> {
  const { contextType, contextId } = normalized;
  try {
    if (
      contextType === ChatRoomContextType.APPLICATION ||
      contextType === ChatRoomContextType.INVITATION ||
      contextType === ChatRoomContextType.VACANCY
    ) {
      if (contextType === ChatRoomContextType.VACANCY && contextId) {
        const v = await prisma.vacancy.findFirst({
          where: { id: contextId, employerId: pair.employerId },
          select: { title: true },
        });
        const title = v?.title?.trim();
        return title ? `Открыт чат по вакансии «${title}».` : 'Открыт чат по вакансии.';
      }
      if (contextId) {
        const app = await prisma.application.findFirst({
          where: {
            id: contextId,
            workerId: pair.workerId,
            vacancy: { employerId: pair.employerId },
          },
          include: { vacancy: { select: { title: true } } },
        });
        const title = app?.vacancy?.title?.trim();
        if (!title) return 'Открыт чат по отклику.';
        return `Открыт чат по вакансии «${title}».`;
      }
    }
    if (contextType === ChatRoomContextType.SHIFT && contextId) {
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
      if (!wp || !ep) return 'Открыт чат по смене.';
      const shift = await prisma.shift.findFirst({
        where: {
          id: contextId,
          workerId: wp.userId,
          employerId: ep.userId,
        },
        include: { booking: { select: { date: true } } },
      });
      const d = shift?.booking?.date;
      if (d) {
        const label = new Date(d).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        return `Открыт чат по смене ${label}.`;
      }
      return 'Открыт чат по смене.';
    }
  } catch {
    /* fall through */
  }
  return 'Чат открыт. Общайтесь в рамках сделки на платформе.';
}
