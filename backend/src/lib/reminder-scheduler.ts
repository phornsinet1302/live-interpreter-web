import * as remindersRepo from "../modules/reminders/reminders.repository";
import * as notificationsService from "../modules/notifications/notifications.service";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 30_000;

// In-process poller — simple and correct for this app's current scale, but
// resets on restart (a due reminder missed mid-check just fires on the next
// tick, nothing is lost) and doesn't coordinate across multiple backend
// instances (would double-fire if ever horizontally scaled). A real queue
// (e.g. BullMQ) would be the fix if either of those becomes a problem.
async function checkDueReminders() {
  const now = new Date();
  const due = await remindersRepo.findDue(now);
  for (const reminder of due) {
    await notificationsService.createForUser(reminder.userId, {
      title: "Reminder",
      message: reminder.message,
      type: "info",
      preferenceKey: "notifyReminders",
    });
    await remindersRepo.markFired(reminder.id, now);
  }
}

export function startReminderScheduler(): void {
  setInterval(() => {
    checkDueReminders().catch((error) => logger.error("Reminder scheduler tick failed", error));
  }, POLL_INTERVAL_MS);
}
