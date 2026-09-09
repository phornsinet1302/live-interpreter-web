import { randomBytes } from "node:crypto";
import * as repo from "./subtitles.repository";
import { getConversationForOwner } from "../conversations/conversations.service";
import { ApiError } from "../../utils/api-error";
import { getIO } from "../../websocket/socket";
import { conversationRoom, SOCKET_EVENTS } from "../../websocket/events";
import type {
  CreateSubtitleSessionInput,
  PushSubtitleTextInput,
  UpdateSubtitleSessionInput,
} from "./subtitles.validator";

// Broadcasts to both rooms a session's updates need to reach: the owner's
// own authenticated tabs (conversationRoom) and the public, code-only
// second-display viewer (the /subtitles namespace, room = sessionCode).
function broadcastSessionUpdate(conversationId: string, session: Record<string, unknown> & { sessionCode: string }) {
  const io = getIO();
  io?.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.SUBTITLE_UPDATE, session);
  io?.of("/subtitles").to(session.sessionCode).emit(SOCKET_EVENTS.SUBTITLE_UPDATE, session);
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function generateSessionCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (const byte of bytes) code += CODE_CHARS[byte % CODE_CHARS.length];
  return code;
}

async function createUniqueSession(
  conversationId: string,
  input: CreateSubtitleSessionInput
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await repo.create(conversationId, generateSessionCode(), input);
    } catch (error) {
      const isUniqueViolation =
        error instanceof Object && (error as { code?: string }).code === "P2002";
      if (!isUniqueViolation) throw error;
    }
  }
  throw new ApiError(500, "Failed to generate a unique session code", "INTERNAL_ERROR");
}

export async function createSession(
  conversationId: string,
  userId: string,
  input: CreateSubtitleSessionInput
) {
  await getConversationForOwner(conversationId, userId);

  await repo.deactivateAllForConversation(conversationId);
  const session = await createUniqueSession(conversationId, input);

  broadcastSessionUpdate(conversationId, session);
  return session;
}

export async function getSession(conversationId: string, userId: string) {
  await getConversationForOwner(conversationId, userId);
  const session = await repo.findLatestByConversation(conversationId);
  if (!session) throw ApiError.notFound("No subtitle session exists for this conversation yet");
  return session;
}

export async function updateSession(
  conversationId: string,
  userId: string,
  input: UpdateSubtitleSessionInput
) {
  await getConversationForOwner(conversationId, userId);
  const current = await repo.findLatestByConversation(conversationId);
  if (!current) throw ApiError.notFound("No subtitle session exists for this conversation yet");

  const updated = await repo.update(current.id, input);
  broadcastSessionUpdate(conversationId, updated);
  return updated;
}

export async function deleteSession(conversationId: string, userId: string) {
  await getConversationForOwner(conversationId, userId);
  const current = await repo.findLatestByConversation(conversationId);
  if (!current) throw ApiError.notFound("No subtitle session exists for this conversation yet");
  await repo.remove(current.id);
  // The row is gone, so there's nothing left to re-fetch — tell whoever's
  // still watching directly, or the viewer would just sit on stale text
  // forever with no signal the presenter stopped.
  broadcastSessionUpdate(conversationId, { ...current, status: "expired" });
}

// Live caption relay — called once per finalized transcript line while a
// subtitle session is active. Nothing here is persisted (the session's
// createdAt/settings are the only DB state); this is a pure broadcast to
// whoever is currently watching.
export async function pushText(
  conversationId: string,
  userId: string,
  input: PushSubtitleTextInput
) {
  await getConversationForOwner(conversationId, userId);
  const session = await repo.findLatestByConversation(conversationId);
  if (!session || session.status !== "active") {
    throw ApiError.conflict("No active subtitle session for this conversation");
  }

  const payload = {
    source: input.source,
    translated: input.translated,
    speakerName: input.speakerName ?? null,
    at: new Date().toISOString(),
  };
  const io = getIO();
  io?.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.SUBTITLE_TEXT, payload);
  io?.of("/subtitles").to(session.sessionCode).emit(SOCKET_EVENTS.SUBTITLE_TEXT, payload);
  return payload;
}

// Public — no auth, no ownership check. Only ever exposes what a viewer
// needs to render (display settings), never the conversationId or anything
// that could be used to reach the owner's other data.
export async function getByCode(sessionCode: string) {
  const session = await repo.findByCode(sessionCode);
  if (!session) throw ApiError.notFound("No subtitle session found for this code");
  return {
    fontSize: session.fontSize,
    fontColor: session.fontColor,
    backgroundColor: session.backgroundColor,
    status: session.status,
  };
}
