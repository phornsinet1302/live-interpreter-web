const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

export interface SummaryResult {
  summary: string[];
  nextSteps: string[];
}

export async function summarizeConversation(
  exchanges: { source: string; translated: string }[],
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
