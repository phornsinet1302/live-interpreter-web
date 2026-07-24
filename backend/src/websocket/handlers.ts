import type { Server, Socket } from "socket.io";
import { logger } from "../lib/logger";
import { assertConversationAccess } from "../modules/conversations/conversations.service";
import { conversationRoom, SOCKET_EVENTS } from "./events";

export function registerHandlers(_io: Server, socket: Socket) {
  const user = socket.data.user as { sub: string; role: string };
  logger.info("Socket connected", { userId: user.sub, socketId: socket.id });

  socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, async (conversationId: string, ack?: (res: { ok: boolean; error?: string }) => void) => {
    try {
      await assertConversationAccess(conversationId, user);
      await socket.join(conversationRoom(conversationId));
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err instanceof Error ? err.message : "Failed to join" });
    }
  });

  socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (conversationId: string) => {
    socket.leave(conversationRoom(conversationId));
  });

  socket.on("disconnect", () => {
    logger.info("Socket disconnected", { userId: user.sub, socketId: socket.id });
  });
}
