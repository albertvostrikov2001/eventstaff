import type { PrismaClient } from '@prisma/client';
import { ReliabilityLevel, ShiftStatus } from '@prisma/client';
import type { NotificationService } from '@/services/notification-service';

const PENALTY_FAILED_SHIFT = 15;
const PENALTY_STRIKE = 10;

function computeLevel(
  totalTerminal: number,
  _successful: number,
  score: number,
  strikeCount: number,
): ReliabilityLevel {
  if (score < 40 || strikeCount >= 3) return ReliabilityLevel.RESTRICTED;
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

    const level = computeLevel(totalTerminal, successful, score, strikeCount);
    const isRestricted = score < 40 || strikeCount >= 3;
    const wasRestricted = existing?.isRestricted ?? false;

    const restrictedReason = isRestricted
      ? score < 40
        ? 'Низкий рейтинг надёжности'
        : 'Превышен лимит нарушений (3 страйка)'
      : undefined;

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
        isRestricted,
        restrictedAt: isRestricted ? new Date() : undefined,
        restrictedReason: isRestricted ? restrictedReason : undefined,
      },
      update: {
        totalShifts: totalTerminal,
        successfulShifts: successful,
        failedShifts: failed,
        cancelledShifts: cancelled,
        score,
        level,
        isRestricted,
        ...(isRestricted && !wasRestricted
          ? { restrictedAt: new Date(), restrictedReason }
          : {}),
      },
    });

    if (isRestricted && !wasRestricted) {
      await this.notifications.create({
        userId,
        type: 'SYSTEM',
        title: 'Аккаунт ограничен',
        body: String(restrictedReason ?? 'Обратитесь в поддержку.'),
        data: { restricted: true },
      });
    }
  }

  async addStrikeAndRecalculate(userId: string, _reason: string): Promise<void> {
    await this.prisma.userReliabilityScore.upsert({
      where: { userId },
      create: { userId, strikeCount: 1 },
      update: { strikeCount: { increment: 1 } },
    });
    await this.recalculate(userId);
  }
}
