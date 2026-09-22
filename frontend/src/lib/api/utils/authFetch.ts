// Falls back to whatever host the page itself was loaded from (LAN IP,
// localhost, tunnel domain, ...) rather than a hardcoded "localhost" —
// a hardcoded value works from the same machine as the backend but silently
// fails on a phone, where "localhost" resolves to the phone itself. Set
// VITE_API_URL explicitly only when the API lives on a different host than
// the frontend (e.g. a real deployment).
function defaultApiUrl(): string {
  return `${window.location.protocol}//${window.location.hostname}:4000/api/v1`;
}

export const API_URL = import.meta.env.VITE_API_URL ?? defaultApiUrl();

// Legacy avatar URLs from the backend were relative (e.g.
// "/uploads/avatars/x.png") — this strips the "/api/v1" suffix so they
// resolve against the bare backend origin instead of the API path.
export function backendOrigin(): string {
  return API_URL.replace(/\/api\/v1\/?$/, "");
}

// Avatars now upload to Cloudinary (see backend lib/cloudinary.ts), which
// returns an absolute https:// URL — used as-is. Falls back to prefixing
// backendOrigin() for any pre-Cloudinary relative URL still in the DB.
export function avatarSrc(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  return /^https?:\/\//.test(avatarUrl) ? avatarUrl : `${backendOrigin()}${avatarUrl}`;
}

// Clerk's getToken() is only available from the useAuth() hook inside React
// components, but this file is called from plain lib/api/*.ts functions with
// no component context. window.Clerk is the global instance ClerkProvider
// attaches once loaded — the documented way to reach a session token outside
// of React. It also handles refreshing the short-lived session JWT
// internally, so (unlike the old JWT system) there's no manual retry/refresh
// dance needed here on a 401.
async function getClerkToken(): Promise<string | null> {
  const clerk = (window as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk;
  return clerk?.session ? clerk.session.getToken() : null;
}

// Fetch wrapper for every endpoint that requires a signed-in user.
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getClerkToken();
  // FormData (avatar upload) needs the browser to set its own
  // multipart/form-data boundary — a forced json Content-Type would break it.
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}
