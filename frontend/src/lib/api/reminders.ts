import { authFetch } from "./utils/authFetch";

export interface ReminderItem {
  id: string;
  message: string;
  remindAt: string;
  firedAt: string | null;
  createdAt: string;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export class ReminderError extends Error {
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
  throw new ReminderError(res.status, message);
}

// remindAt must be an ISO 8601 datetime string in the future.
export async function createReminder(message: string, remindAt: string): Promise<ReminderItem> {
  const res = await authFetch("/reminders", { method: "POST", body: JSON.stringify({ message, remindAt }) });
  if (!res.ok) return throwFromResponse(res, "Could not schedule the reminder.");
  return res.json();
}

export async function listReminders(): Promise<Paginated<ReminderItem>> {
  const res = await authFetch("/reminders?limit=50");
  if (!res.ok) throw new Error(`Failed to load reminders (${res.status})`);
  return res.json();
}

export async function cancelReminder(id: string): Promise<void> {
  await authFetch(`/reminders/${id}`, { method: "DELETE" });
}
