const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

export interface NextStepResult {
  suggestions: string[];
}

export async function getNextStep(
  exchanges: { source: string; translated: string }[],
  sourceLanguage: string
): Promise<NextStepResult> {
  const res = await fetch(`${API_URL}/next-step`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exchanges, sourceLanguage }),
  });

  if (!res.ok) {
    throw new Error(`Next-step suggestion failed (${res.status})`);
  }

  return res.json() as Promise<NextStepResult>;
}
