const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

export interface TranscribeResult {
  transcript: string;
  translatedText: string;
  provider: string;
  confidence: number | null;
}

export class TranscribeError extends Error {
  constructor(public status: number) {
    super(`Transcription failed (${status})`);
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function transcribeAudio(
  audioBlob: Blob,
  mimeType: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranscribeResult> {
  const audio = await blobToBase64(audioBlob);
  const res = await fetch(`${API_URL}/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio, mimeType, sourceLanguage, targetLanguage }),
  });

  if (!res.ok) {
    throw new TranscribeError(res.status);
  }

  return res.json() as Promise<TranscribeResult>;
}
