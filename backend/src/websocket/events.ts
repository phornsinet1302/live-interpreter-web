// Client -> server event names.
export const SOCKET_EVENTS = {
  JOIN_CONVERSATION: "conversation:join",
  LEAVE_CONVERSATION: "conversation:leave",
} as const;

// Server -> client event names, broadcast to a conversation's room.
export const SOCKET_BROADCASTS = {
  MESSAGE_CREATED: "message:created",
  MESSAGE_DELETED: "message:deleted",
  CONVERSATION_UPDATED: "conversation:updated",
  SPEAKER_UPDATED: "speaker:updated",
  SUBTITLE_UPDATED: "subtitle:updated",
} as const;

export function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}
