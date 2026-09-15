import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { logger } from "./logger";

// No access token required for basic sending — Expo's push service accepts
// unauthenticated requests, an access token only raises the rate limit.
const expo = new Expo();

// Fire-and-forget: notification delivery should never block or fail the
// request that triggered it (an export finishing, a message arriving). Errors
// are logged, not thrown. This does NOT check delivery receipts (which would
// catch a stale/uninstalled-app token and let us clear it) — an acceptable
// gap for now; ExponentPushToken errors just get logged and the token stays
// until the user re-registers or explicitly clears it.
async function deliver(messages: ExpoPushMessage[]): Promise<void> {
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      logger.error("Failed to send push notification chunk", error);
    }
  }
}

export async function sendPushToToken(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!Expo.isExpoPushToken(token)) {
    logger.warn("Skipping push — not a valid Expo push token", { token });
    return;
  }
  await deliver([{ to: token, sound: "default", title, body, data }]);
}

export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const valid = tokens.filter((t) => Expo.isExpoPushToken(t));
  if (valid.length === 0) return;
  await deliver(valid.map((to) => ({ to, sound: "default", title, body, data })));
}
