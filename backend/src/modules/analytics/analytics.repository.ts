import { prisma } from "../../lib/prisma";

async function conversationIdsForOwner(ownerId: string): Promise<string[]> {
  const rows = await prisma.conversation.findMany({
    where: { ownerId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function dashboardStats(ownerId: string) {
  const [conversationCount, statusCounts, messageAgg, recent] = await Promise.all([
    prisma.conversation.count({ where: { ownerId } }),
    prisma.conversation.groupBy({
      by: ["status"],
      where: { ownerId },
      _count: { _all: true },
    }),
    prisma.conversationMessage.aggregate({
      where: { conversation: { ownerId } },
      _count: { _all: true },
      _avg: { confidence: true },
    }),
    prisma.conversation.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    totalConversations: conversationCount,
    conversationsByStatus: Object.fromEntries(
      statusCounts.map((s) => [s.status, s._count._all])
    ),
    totalMessages: messageAgg._count._all,
    averageConfidence: messageAgg._avg.confidence,
    recentConversations: recent,
  };
}

export async function translationStats(ownerId: string) {
  const ids = await conversationIdsForOwner(ownerId);
  if (ids.length === 0) {
    return { totalMessages: 0, byProvider: [], byDay: [] };
  }

  const [byProvider, messages] = await Promise.all([
    prisma.conversationMessage.groupBy({
      by: ["translationProvider"],
      where: { conversationId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.conversationMessage.findMany({
      where: { conversationId: { in: ids } },
      select: { createdAt: true },
    }),
  ]);

  const byDayMap = new Map<string, number>();
  for (const m of messages) {
    const day = m.createdAt.toISOString().slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
  }

  return {
    totalMessages: messages.length,
    byProvider: byProvider.map((p) => ({
      provider: p.translationProvider,
      count: p._count._all,
    })),
    byDay: Array.from(byDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day, count })),
  };
}

export async function languageStats(ownerId: string) {
  const ids = await conversationIdsForOwner(ownerId);
  if (ids.length === 0) return { pairs: [] };

  const rows = await prisma.conversationMessage.groupBy({
    by: ["sourceLanguage", "targetLanguage"],
    where: { conversationId: { in: ids } },
    _count: { _all: true },
  });

  return {
    pairs: rows
      .map((r) => ({
        sourceLanguage: r.sourceLanguage,
        targetLanguage: r.targetLanguage,
        count: r._count._all,
      }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function userStats() {
  const [total, verified, byRole] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, isVerified: true } }),
    prisma.user.groupBy({
      by: ["role"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  return {
    totalUsers: total,
    verifiedUsers: verified,
    byRole: Object.fromEntries(byRole.map((r) => [r.role, r._count._all])),
  };
}

export async function apiUsageStats() {
  const [total, avgResponseTime, topEndpoints] = await Promise.all([
    prisma.apiUsageLog.count(),
    prisma.apiUsageLog.aggregate({ _avg: { responseTime: true } }),
    prisma.apiUsageLog.groupBy({
      by: ["endpoint"],
      _count: { _all: true },
      // Ordering by count of the grouped field itself (never null, so its
      // count per group equals the group size) — Prisma's groupBy orderBy
      // for aggregates only accepts real field names, not `_all`.
      orderBy: { _count: { endpoint: "desc" } },
      take: 10,
    }),
  ]);

  return {
    totalRequests: total,
    averageResponseTimeMs: avgResponseTime._avg.responseTime,
    topEndpoints: topEndpoints.map((e) => ({
      endpoint: e.endpoint,
      count: e._count._all,
    })),
  };
}
