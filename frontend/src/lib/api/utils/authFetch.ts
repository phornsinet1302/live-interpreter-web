export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

// Avatar URLs from the backend are relative (e.g. "/uploads/avatars/x.png")
// — this strips the "/api/v1" suffix so they resolve against the bare
// backend origin instead of the API path.
export function backendOrigin(): string {
  return API_URL.replace(/\/api\/v1\/?$/, "");
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
