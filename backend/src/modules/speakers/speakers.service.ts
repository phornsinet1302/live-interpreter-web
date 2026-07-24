// Service -> business rules & orchestration. Calls repository. No req/res.
import { AppError } from "../../utils/app-error";
import { assertConversationAccess, type CurrentUser } from "../conversations/conversations.service";
import * as repo from "./speakers.repository";
import type { CreateSpeakerInput, UpdateSpeakerInput } from "./speakers.validator";

export async function create(conversationId: string, user: CurrentUser, input: CreateSpeakerInput) {
  await assertConversationAccess(conversationId, user);
  return repo.createSpeaker({ conversation: { connect: { id: conversationId } }, ...input });
}

export async function list(conversationId: string, user: CurrentUser) {
  await assertConversationAccess(conversationId, user);
  return repo.listByConversation(conversationId);
}

export async function update(
  conversationId: string,
  speakerId: string,
  user: CurrentUser,
  input: UpdateSpeakerInput
) {
  await assertConversationAccess(conversationId, user);
  const speaker = await repo.findById(conversationId, speakerId);
  if (!speaker) throw AppError.notFound("Speaker not found");
  return repo.updateSpeaker(speakerId, input);
}
