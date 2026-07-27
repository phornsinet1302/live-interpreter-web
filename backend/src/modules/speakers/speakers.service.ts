import * as repo from "./speakers.repository";
import { getConversationForOwner } from "../conversations/conversations.service";
import { ApiError } from "../../utils/api-error";
import { getIO } from "../../websocket/socket";
import { conversationRoom, SOCKET_EVENTS } from "../../websocket/events";
import type { CreateSpeakerInput, UpdateSpeakerInput } from "./speakers.validator";

export async function createSpeaker(
  conversationId: string,
  userId: string,
  input: CreateSpeakerInput
) {
  await getConversationForOwner(conversationId, userId);
  return repo.create(conversationId, input);
}

export async function listSpeakers(conversationId: string, userId: string) {
  await getConversationForOwner(conversationId, userId);
  return repo.findManyByConversation(conversationId);
}

export async function updateSpeaker(
  conversationId: string,
  speakerId: string,
  userId: string,
  input: UpdateSpeakerInput
) {
  await getConversationForOwner(conversationId, userId);
  const speaker = await repo.findById(conversationId, speakerId);
  if (!speaker) throw ApiError.notFound("Speaker not found");

  const updated = await repo.update(speakerId, input);
  getIO()?.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.SPEAKER_UPDATE, updated);
  return updated;
}
