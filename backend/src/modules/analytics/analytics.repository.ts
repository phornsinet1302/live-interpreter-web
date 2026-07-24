// Repository -> the ONLY layer that touches Prisma/DB for this module.
import { prisma } from "../../lib/prisma";

export async function dashboardCounts() {
  const [totalUsers, totalConversations, activeConversations, totalMessages, totalExports] =
    await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.conversation.count(),
      prisma.conversation.count({ where: { status: { in: ["active", "paused"] } } }),
      prisma.conversationMessage.count(),
      prisma.export.count(),
    ]);
  return { totalUsers, totalConversations, activeConversations, totalMessages, totalExports };
}

export async function translationVolumeByDay(days: number) {
  return prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT date_trunc('day', "created_at") AS day, COUNT(*)::bigint AS count
    FROM "conversation_messages"
    WHERE "created_at" >= NOW() - (${days}::text || ' days')::interval
    GROUP BY day
    ORDER BY day ASC
  `;
}

export function languagePairCounts() {
  return prisma.conversation.groupBy({
    by: ["sourceLanguage", "targetLanguage"],
    _count: { _all: true },
    orderBy: { _count: { sourceLanguage: "desc" } },
    take: 20,
  });
}

export async function userStats(days: number) {
  const [totalUsers, byRole, newUsers] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true }, where: { deletedAt: null } }),
    prisma.user.count({
      where: { deletedAt: null, createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
    }),
  ]);
  return { totalUsers, byRole, newUsers };
}

export async function apiUsageStats(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [totalRequests, avgResponseTime, byEndpoint, errorCount] = await Promise.all([
    prisma.apiUsageLog.count({ where: { createdAt: { gte: since } } }),
    prisma.apiUsageLog.aggregate({
      where: { createdAt: { gte: since } },
      _avg: { responseTime: true },
    }),
    prisma.apiUsageLog.groupBy({
      by: ["endpoint", "method"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _avg: { responseTime: true },
      orderBy: { _count: { endpoint: "desc" } },
      take: 20,
    }),
    prisma.apiUsageLog.count({ where: { createdAt: { gte: since }, statusCode: { gte: 400 } } }),
  ]);
  return {
    totalRequests,
    errorCount,
    avgResponseTimeMs: avgResponseTime._avg.responseTime ?? 0,
    byEndpoint,
  };
}
