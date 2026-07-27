// Typed Socket.IO event name constants shared between server emitters and
// (eventually) client listeners.
export const SOCKET_EVENTS = {
  CONVERSATION_JOIN: "conversation:join",
  CONVERSATION_LEAVE: "conversation:leave",
  CONVERSATION_STATUS: "conversation:status",
  MESSAGE_NEW: "message:new",
  SUBTITLE_UPDATE: "subtitle:update",
  SPEAKER_UPDATE: "speaker:update",
} as const;

export function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}
