import { API_URL } from "./utils/authFetch";

export interface TranslateResult {
  translatedText: string;
  provider: string;
  confidence: number | null;
}

export class TranslateError extends Error {
  constructor(public status: number) {
    super(`Translation failed (${status})`);
  }
}

export async function quickTranslate(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslateResult> {
  const res = await fetch(`${API_URL}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
  });

  if (!res.ok) {
    throw new TranslateError(res.status);
  }

  return res.json() as Promise<TranslateResult>;
}
