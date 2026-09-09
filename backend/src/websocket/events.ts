// Typed Socket.IO event name constants shared between server emitters and
// (eventually) client listeners.
export const SOCKET_EVENTS = {
  CONVERSATION_JOIN: "conversation:join",
  CONVERSATION_LEAVE: "conversation:leave",
  CONVERSATION_STATUS: "conversation:status",
  MESSAGE_NEW: "message:new",
  SUBTITLE_UPDATE: "subtitle:update",
  SUBTITLE_TEXT: "subtitle:text",
  SPEAKER_UPDATE: "speaker:update",
  NOTIFICATION_NEW: "notification:new",
} as const;

export function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}

// Notifications are per-user, not per-conversation — every authenticated
// socket auto-joins its own user room on connect (see websocket/socket.ts)
// so a notification can reach a client regardless of which page it's on.
export function userRoom(userId: string): string {
  return `user:${userId}`;
}
