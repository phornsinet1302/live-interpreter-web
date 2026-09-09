import { authFetch } from "./utils/authFetch";

export type ExportType = "transcript" | "summary" | "audio" | "full";
export type ExportFormat = "pdf" | "docx" | "txt";

export interface ExportRecord {
  id: string;
  conversationId: string;
  status: "pending" | "processing" | "completed" | "failed";
  type: ExportType;
  fileUrl: string | null;
}

export class ExportError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function throwFromResponse(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const body = await res.json();
    message = body?.error?.message ?? body?.message ?? fallback;
  } catch {
    // Non-JSON error body — stick with the fallback.
  }
  throw new ExportError(res.status, message);
}

// Generation is synchronous on the backend — the returned record's `status`
// already reflects the outcome (no polling needed).
export async function requestExport(
  conversationId: string,
  type: ExportType,
  format: ExportFormat
): Promise<ExportRecord> {
  const res = await authFetch(`/conversations/${conversationId}/exports`, {
    method: "POST",
    body: JSON.stringify({ type, format }),
  });
  if (!res.ok) return throwFromResponse(res, "Could not generate the export.");
  return res.json();
}

function filenameFromContentDisposition(header: string | null, fallback: string): string {
  const match = header?.match(/filename="?([^"]+)"?/);
  return match ? match[1] : fallback;
}

export async function downloadExport(
  exportId: string,
  fallbackFilename: string
): Promise<{ blob: Blob; filename: string }> {
  const res = await authFetch(`/exports/${exportId}/download`);
  if (!res.ok) return throwFromResponse(res, "Could not download the export.");
  const blob = await res.blob();
  const filename = filenameFromContentDisposition(res.headers.get("Content-Disposition"), fallbackFilename);
  return { blob, filename };
}
