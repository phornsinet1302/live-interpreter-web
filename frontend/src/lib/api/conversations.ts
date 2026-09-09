import { authFetch } from "./utils/authFetch";
import type { ConversationEntry, ConversationMessage } from "@/types";

export interface BackendConversation {
  id: string;
  status: string;
  sourceLanguage: string;
  targetLanguage: string;
}

async function unwrap<T>(res: Response, action: string): Promise<T> {
  if (!res.ok) throw new Error(`${action} failed (${res.status})`);
  return res.json() as Promise<T>;
}

export async function createConversation(
  sourceLanguage: string,
  targetLanguage: string
): Promise<BackendConversation> {
  const res = await authFetch("/conversations", {
    method: "POST",
    body: JSON.stringify({ sourceLanguage, targetLanguage, title: "Live Translation Session" }),
  });
  return unwrap(res, "Create conversation");
}

export async function startConversation(id: string): Promise<BackendConversation> {
  const res = await authFetch(`/conversations/${id}/start`, { method: "PATCH" });
  return unwrap(res, "Start conversation");
}

export async function endConversation(id: string): Promise<BackendConversation> {
  const res = await authFetch(`/conversations/${id}/end`, { method: "PATCH" });
  return unwrap(res, "End conversation");
}

// The backend re-translates server-side (and derives its own confidence
// score from that call) rather than accepting a pre-computed translation —
// see translations.service.createMessage — so only the original text needs
// to be sent here.
export async function createMessage(
  conversationId: string,
  originalText: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<unknown> {
  const res = await authFetch(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ originalText, sourceLanguage, targetLanguage }),
  });
  return unwrap(res, "Save message");
}

export interface SaveSummaryInput {
  summary: string;
  keyPoints?: string[];
  actionItems?: string[];
  keywords?: string[];
}

// Persists an already-computed summary as-is (e.g. the live Gemini
// quick-summary the user already saw) — no AI call, no risk of the saved
// version disagreeing with what was shown during the session.
export async function saveSummary(conversationId: string, input: SaveSummaryInput): Promise<unknown> {
  const res = await authFetch(`/conversations/${conversationId}/summary`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return unwrap(res, "Save summary");
}

// Regenerates via OpenAI from persisted messages — independent of, and may
// read differently from, whatever quick-summary the user saw live.
export async function generateSummary(conversationId: string): Promise<unknown> {
  const res = await authFetch(`/conversations/${conversationId}/summary`, { method: "POST" });
  return unwrap(res, "Generate summary");
}

// ---- FR-5 Translation History — real, account-synced data ----

interface BackendSummaryRow {
  summary: string;
  keyPoints: unknown;
  actionItems: unknown;
  keywords: unknown;
}

interface BackendConversationListItem {
  id: string;
  title: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: string;
  isFavorite: boolean;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  _count: { messages: number };
  summary: BackendSummaryRow | null;
}

function toConversationEntry(row: BackendConversationListItem): ConversationEntry {
  return {
    id: row.id,
    title: row.title,
    sourceLang: row.sourceLanguage,
    targetLang: row.targetLanguage,
    status: row.status as ConversationEntry["status"],
    isFavorite: row.isFavorite,
    messageCount: row._count.messages,
    createdAt: row.createdAt,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    summary: row.summary
      ? {
          summary: row.summary.summary,
          keyPoints: (row.summary.keyPoints as string[] | null) ?? [],
          actionItems: (row.summary.actionItems as { text: string }[] | null) ?? [],
          keywords: (row.summary.keywords as string[] | null) ?? [],
        }
      : null,
  };
}

// Fetches up to 100 conversations in one page rather than building full
// pagination UI — plenty for a personal history at this app's scale, and
// keeps search/filter working over "everything" without a "load more" step.
export async function listConversations(params?: { isFavorite?: boolean }): Promise<ConversationEntry[]> {
  const qs = new URLSearchParams({ limit: "100" });
  if (params?.isFavorite) qs.set("isFavorite", "true");
  const res = await authFetch(`/conversations?${qs.toString()}`);
  const body = await unwrap<{ data: BackendConversationListItem[] }>(res, "Load history");
  return body.data.map(toConversationEntry);
}

interface BackendMessageRow {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  speakerId: string | null;
  createdAt: string;
}

// Lazy — only called when a history card is actually expanded, not for
// every row in the list (see listConversations for the upfront summary).
export async function getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
  const res = await authFetch(`/conversations/${conversationId}/messages?limit=100`);
  const body = await unwrap<{ data: BackendMessageRow[] }>(res, "Load transcript");
  return body.data.map((m) => ({
    id: m.id,
    originalText: m.originalText,
    translatedText: m.translatedText,
    sourceLanguage: m.sourceLanguage,
    targetLanguage: m.targetLanguage,
    speakerId: m.speakerId,
    createdAt: m.createdAt,
  }));
}

export async function updateConversation(id: string, patch: { isFavorite?: boolean; title?: string }): Promise<void> {
  await authFetch(`/conversations/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function deleteConversation(id: string): Promise<void> {
  await authFetch(`/conversations/${id}`, { method: "DELETE" });
}
