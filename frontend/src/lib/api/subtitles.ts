import { authFetch, API_URL } from "./utils/authFetch";

export interface SubtitleSession {
  id: string;
  conversationId: string;
  sessionCode: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  status: "active" | "inactive" | "expired";
}

export interface SubtitleDisplaySettings {
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  status: "active" | "inactive" | "expired";
}

async function unwrap<T>(res: Response, action: string): Promise<T> {
  if (!res.ok) throw new Error(`${action} failed (${res.status})`);
  return res.json() as Promise<T>;
}

export async function createSubtitleSession(
  conversationId: string,
  settings: { fontSize?: number; fontColor?: string; backgroundColor?: string }
): Promise<SubtitleSession> {
  const res = await authFetch(`/conversations/${conversationId}/subtitles`, {
    method: "POST",
    body: JSON.stringify(settings),
  });
  return unwrap(res, "Create subtitle session");
}

export async function updateSubtitleSession(
  conversationId: string,
  patch: Partial<{ fontSize: number; fontColor: string; backgroundColor: string; status: string }>
): Promise<SubtitleSession> {
  const res = await authFetch(`/conversations/${conversationId}/subtitles`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return unwrap(res, "Update subtitle session");
}

export async function endSubtitleSession(conversationId: string): Promise<void> {
  await authFetch(`/conversations/${conversationId}/subtitles`, { method: "DELETE" });
}

// Fire-and-forget from the caller's point of view — a missed caption line
// isn't worth surfacing as an error to the presenter mid-sentence.
export async function pushSubtitleText(
  conversationId: string,
  data: { source: string; translated: string; speakerName?: string }
): Promise<void> {
  await authFetch(`/conversations/${conversationId}/subtitles/push`, {
    method: "POST",
    body: JSON.stringify(data),
  }).catch(() => {});
}

// Public — no auth, used by the second-display viewer, which only has the
// shareable code.
export async function getPublicSubtitleSession(code: string): Promise<SubtitleDisplaySettings> {
  const res = await fetch(`${API_URL}/subtitles/${code}`);
  return unwrap(res, "Load subtitle session");
}
