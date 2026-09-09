import * as repo from "./analytics.repository";

export const getDashboard = repo.dashboardStats;
export const getTranslationStats = repo.translationStats;
export const getLanguageStats = repo.languageStats;
export const getSummaryUsage = repo.summaryUsageStats;
export const getHistoryUsage = repo.historyUsageStats;
export const getUserStats = repo.userStats;
export const getApiUsageStats = repo.apiUsageStats;
