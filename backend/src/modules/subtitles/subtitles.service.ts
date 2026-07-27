import { randomBytes } from "node:crypto";
import * as repo from "./subtitles.repository";
import { getConversationForOwner } from "../conversations/conversations.service";
import { ApiError } from "../../utils/api-error";
import { getIO } from "../../websocket/socket";
import { conversationRoom, SOCKET_EVENTS } from "../../websocket/events";
import type { CreateSubtitleSessionInput, UpdateSubtitleSessionInput } from "./subtitles.validator";

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

  getIO()?.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.SUBTITLE_UPDATE, session);
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
  getIO()?.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.SUBTITLE_UPDATE, updated);
  return updated;
}

export async function deleteSession(conversationId: string, userId: string) {
  await getConversationForOwner(conversationId, userId);
  const current = await repo.findLatestByConversation(conversationId);
  if (!current) throw ApiError.notFound("No subtitle session exists for this conversation yet");
  await repo.remove(current.id);
}
