import { authFetch } from "./utils/authFetch";

export interface DashboardStats {
  totalConversations: number;
  conversationsByStatus: Record<string, number>;
  totalMessages: number;
  averageConfidence: number | null;
  recentConversations: { id: string; title: string; status: string; createdAt: string }[];
}

export interface TranslationStats {
  totalMessages: number;
  byProvider: { provider: string | null; count: number }[];
  byDay: { day: string; count: number }[];
  byWeek: { week: string; count: number }[];
  byMonth: { month: string; count: number }[];
}

export interface LanguageStats {
  pairs: { sourceLanguage: string; targetLanguage: string; count: number }[];
}

export interface SummaryUsageStats {
  totalConversations: number;
  conversationsSummarized: number;
}

export interface HistoryUsageStats {
  totalConversations: number;
  totalMessages: number;
  endedConversations: number;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await authFetch(path);
  if (!res.ok) throw new Error(`Analytics request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export const getDashboardStats = () => getJson<DashboardStats>("/analytics/dashboard");
export const getTranslationStats = () => getJson<TranslationStats>("/analytics/translations");
export const getLanguageStats = () => getJson<LanguageStats>("/analytics/languages");
export const getSummaryUsage = () => getJson<SummaryUsageStats>("/analytics/summary-usage");
export const getHistoryUsage = () => getJson<HistoryUsageStats>("/analytics/history-usage");
