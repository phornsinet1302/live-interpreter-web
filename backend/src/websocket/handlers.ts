import type { Socket } from "socket.io";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { conversationRoom, SOCKET_EVENTS } from "./events";

// One socket can watch multiple conversations; ownership is re-checked on
// every join (cheap single-row lookup) rather than trusted from elsewhere.
export function registerConversationHandlers(socket: Socket) {
  const userId = socket.data.userId as string;

  socket.on(SOCKET_EVENTS.CONVERSATION_JOIN, async (conversationId: string, ack?: (ok: boolean) => void) => {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { ownerId: true },
      });
      if (!conversation || conversation.ownerId !== userId) {
        ack?.(false);
        return;
      }
      socket.join(conversationRoom(conversationId));
      ack?.(true);
    } catch (error) {
      logger.error("conversation:join failed", error);
      ack?.(false);
    }
  });

  socket.on(SOCKET_EVENTS.CONVERSATION_LEAVE, (conversationId: string) => {
    socket.leave(conversationRoom(conversationId));
  });
}
