import { API_URL } from "./utils/authFetch";

export interface SpeakerSummary {
  speaker: string;
  summary: string;
}

export interface SummaryResult {
  summary: string[];
  nextSteps: string[];
  speakerSummaries: SpeakerSummary[];
}

export async function summarizeConversation(
  exchanges: { source: string; translated: string; speakerName?: string }[],
  sourceLanguage: string,
  targetLanguage: string
): Promise<SummaryResult> {
  const res = await fetch(`${API_URL}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exchanges, sourceLanguage, targetLanguage }),
  });

  if (!res.ok) {
    throw new Error(`Summarization failed (${res.status})`);
  }

  return res.json() as Promise<SummaryResult>;
}
