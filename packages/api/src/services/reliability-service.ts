import type { PrismaClient } from '@prisma/client';
import { ReliabilityLevel, ShiftStatus } from '@prisma/client';
import type { NotificationService } from '@/services/notification-service';

const PENALTY_FAILED_SHIFT = 15;
const PENALTY_STRIKE = 10;

function computeLevel(
  totalTerminal: number,
  _successful: number,
  score: number,
  isRestricted: boolean,
): ReliabilityLevel {
  // Ограничение — только ручное (админ). Автоматически по рейтингу/страйкам не выставляется.
  if (isRestricted) return ReliabilityLevel.RESTRICTED;
  if (totalTerminal === 0) return ReliabilityLevel.NEW;
  if (totalTerminal >= 20 && score >= 90) return ReliabilityLevel.VERIFIED;
  if (totalTerminal >= 6 && totalTerminal <= 20 && score >= 75) return ReliabilityLevel.TRUSTED;
  if (totalTerminal >= 1 && totalTerminal <= 5 && score >= 60) return ReliabilityLevel.BEGINNER;
  if (totalTerminal > 0) return ReliabilityLevel.NEW;
  return ReliabilityLevel.NEW;
}

export class ReliabilityService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly notifications: NotificationService,
  ) {}

  async recalculate(userId: string): Promise<void> {
    const [asWorker, asEmployer, existing] = await Promise.all([
      this.prisma.shift.findMany({
        where: {
          workerId: userId,
          status: { in: [ShiftStatus.COMPLETED, ShiftStatus.FAILED, ShiftStatus.CANCELLED] },
        },
      }),
      this.prisma.shift.findMany({
        where: {
          employerId: userId,
          status: { in: [ShiftStatus.COMPLETED, ShiftStatus.FAILED, ShiftStatus.CANCELLED] },
        },
      }),
      this.prisma.userReliabilityScore.findUnique({ where: { userId } }),
    ]);
    const byId = new Map<string, (typeof asWorker)[0]>();
    for (const s of [...asWorker, ...asEmployer]) {
      if (!byId.has(s.id)) byId.set(s.id, s);
    }
    const u = [...byId.values()];

    const successful = u.filter((s) => s.status === ShiftStatus.COMPLETED).length;
    const failed = u.filter((s) => s.status === ShiftStatus.FAILED).length;
    const cancelled = u.filter((s) => s.status === ShiftStatus.CANCELLED).length;
    const totalTerminal = u.length;
    const strikeCount = existing?.strikeCount ?? 0;

    const ratioBase =
      totalTerminal > 0 ? (successful / totalTerminal) * 100 : 100;
    let score = ratioBase - PENALTY_FAILED_SHIFT * failed - PENALTY_STRIKE * strikeCount;
    if (score < 0) score = 0;
    if (score > 100) score = 100;

    // Ограничение аккаунта выставляется ТОЛЬКО администратором вручную.
    // Здесь сохраняем уже существующее значение и не накладываем ограничения автоматически.
    const isRestricted = existing?.isRestricted ?? false;
    const level = computeLevel(totalTerminal, successful, score, isRestricted);

    await this.prisma.userReliabilityScore.upsert({
      where: { userId },
      create: {
        userId,
        totalShifts: totalTerminal,
        successfulShifts: successful,
        failedShifts: failed,
        cancelledShifts: cancelled,
        score,
        level,
        strikeCount,
        isRestricted: false,
      },
      update: {
        totalShifts: totalTerminal,
        successfulShifts: successful,
        failedShifts: failed,
        cancelledShifts: cancelled,
        score,
        level,
        // isRestricted / restrictedAt / restrictedReason намеренно не трогаем —
        // ими управляет только администратор.
      },
    });
  }

  async addStrikeAndRecalculate(userId: string, reason: string): Promise<void> {
    void reason; // reserved for future audit / logging
    await this.prisma.userReliabilityScore.upsert({
      where: { userId },
      create: { userId, strikeCount: 1 },
      update: { strikeCount: { increment: 1 } },
    });
    await this.recalculate(userId);
  }
}
