import type { ConversationStatus } from "../../lib/prisma-client";

// Which status a conversation may move to from its current status, keyed by
// the lifecycle action that triggers the move.
export const ALLOWED_TRANSITIONS: Record<
  "start" | "pause" | "resume" | "end",
  { from: ConversationStatus[]; to: ConversationStatus }
> = {
  start: { from: ["waiting"], to: "active" },
  pause: { from: ["active"], to: "paused" },
  resume: { from: ["paused"], to: "active" },
  end: { from: ["waiting", "active", "paused"], to: "ended" },
};
