// Service -> business rules & orchestration. Calls repository. No req/res.
import * as repo from "./analytics.repository";
import type { RangeQueryInput } from "./analytics.validator";

export async function getDashboard() {
  return repo.dashboardCounts();
}

export async function getTranslationStats({ days }: RangeQueryInput) {
  const rows = await repo.translationVolumeByDay(days);
  // $queryRaw returns bigint for COUNT(*); JSON can't serialize that natively.
  return rows.map((row) => ({ day: row.day, count: Number(row.count) }));
}

export async function getLanguageStats() {
  const groups = await repo.languagePairCounts();
  return groups.map((g) => ({
    sourceLanguage: g.sourceLanguage,
    targetLanguage: g.targetLanguage,
    count: g._count._all,
  }));
}

export async function getUserStats({ days }: RangeQueryInput) {
  const { totalUsers, byRole, newUsers } = await repo.userStats(days);
  return {
    totalUsers,
    newUsers,
    byRole: byRole.map((r) => ({ role: r.role, count: r._count._all })),
  };
}

export async function getApiUsageStats({ days }: RangeQueryInput) {
  const stats = await repo.apiUsageStats(days);
  return {
    totalRequests: stats.totalRequests,
    errorCount: stats.errorCount,
    avgResponseTimeMs: Math.round(stats.avgResponseTimeMs),
    byEndpoint: stats.byEndpoint.map((e) => ({
      endpoint: e.endpoint,
      method: e.method,
      count: e._count._all,
      avgResponseTimeMs: Math.round(e._avg.responseTime ?? 0),
    })),
  };
}
