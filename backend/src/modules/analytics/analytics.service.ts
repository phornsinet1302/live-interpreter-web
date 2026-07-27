import * as repo from "./analytics.repository";

export const getDashboard = repo.dashboardStats;
export const getTranslationStats = repo.translationStats;
export const getLanguageStats = repo.languageStats;
export const getUserStats = repo.userStats;
export const getApiUsageStats = repo.apiUsageStats;
