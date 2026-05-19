import { ChatRoomContextType, type PrismaClient } from '@prisma/client';

export type RoomContextLine = {
  subtitle: string | null;
  vacancyId?: string | null;
  vacancyTitle?: string | null;
  vacancyUnavailable: boolean;
};

/**
 * Employer-side list row subtitle for room context (worker profile).
 */
export async function computeRoomContextLine(
  prisma: PrismaClient,
  room: {
    employerId: string;
    workerId: string;
    contextType: ChatRoomContextType;
    contextId: string | null;
  },
): Promise<RoomContextLine> {
  const { contextType, contextId } = room;
  const none = (): RoomContextLine => ({
    subtitle: null,
    vacancyUnavailable: false,
  });
  try {
    if (
      contextType === ChatRoomContextType.APPLICATION ||
      contextType === ChatRoomContextType.INVITATION
    ) {
      if (!contextId) return none();
      const app = await prisma.application.findFirst({
        where: {
          id: contextId,
          workerId: room.workerId,
          vacancy: { employerId: room.employerId },
        },
        include: { vacancy: { select: { id: true, title: true } } },
      });
      if (!app?.vacancy) {
        return { subtitle: 'Контекст недоступен', vacancyUnavailable: true };
      }
      const title = app.vacancy.title.trim();
      if (contextType === ChatRoomContextType.INVITATION) {
        return {
          subtitle: `По приглашению · ${title}`,
          vacancyId: app.vacancy.id,
          vacancyTitle: title,
          vacancyUnavailable: false,
        };
      }
      return {
        subtitle: `По отклику · ${title}`,
        vacancyId: app.vacancy.id,
        vacancyTitle: title,
        vacancyUnavailable: false,
      };
    }
    if (contextType === ChatRoomContextType.VACANCY) {
      if (!contextId) return none();
      const v = await prisma.vacancy.findFirst({
        where: { id: contextId, employerId: room.employerId },
        select: { id: true, title: true },
      });
      if (!v) {
        return { subtitle: 'Контекст недоступен', vacancyUnavailable: true };
      }
      return {
        subtitle: `По вакансии: ${v.title}`,
        vacancyId: v.id,
        vacancyTitle: v.title,
        vacancyUnavailable: false,
      };
    }
    if (contextType === ChatRoomContextType.SHIFT) {
      const [wp, ep] = await Promise.all([
        prisma.workerProfile.findUnique({
          where: { id: room.workerId },
          select: { userId: true },
        }),
        prisma.employerProfile.findUnique({
          where: { id: room.employerId },
          select: { userId: true },
        }),
      ]);
      if (!wp || !ep) return none();
      if (!contextId) return none();
      const shift = await prisma.shift.findFirst({
        where: {
          id: contextId,
          workerId: wp.userId,
          employerId: ep.userId,
        },
        include: { booking: { select: { date: true } } },
      });
      const d = shift?.booking?.date;
      const label = d
        ? new Date(d).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
          })
        : 'смене';
      return {
        subtitle: `По смене · ${label}`,
        vacancyUnavailable: false,
      };
    }
    if (contextType === ChatRoomContextType.GENERAL) {
      return { subtitle: null, vacancyUnavailable: false };
    }
  } catch {
    return { subtitle: 'Контекст недоступен', vacancyUnavailable: true };
  }
  return none();
}
