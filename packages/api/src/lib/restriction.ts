import type { PrismaClient } from '@prisma/client';

export async function getUserRestriction(prisma: PrismaClient, userId: string) {
  const row = await prisma.userReliabilityScore.findUnique({
    where: { userId },
  });
  if (!row?.isRestricted) return { restricted: false as const, reason: null as string | null };
  return {
    restricted: true as const,
    reason: row.restrictedReason,
    strikeCount: row.strikeCount,
  };
}

export function restrictedReply() {
  return {
    status: 403 as const,
    body: {
      error: {
        code: 'ACCOUNT_RESTRICTED',
        message:
          'Аккаунт ограничен из‑за нарушений. Обратитесь в поддержку.',
      },
    },
  };
}
