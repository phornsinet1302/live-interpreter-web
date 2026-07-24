// Service -> business rules & orchestration. Calls repository. No req/res.
import type { Conversation } from "../../lib/prisma-client";
import { AppError } from "../../utils/app-error";
import { parsePagination } from "../../utils/pagination";
import * as repo from "./conversations.repository";
import { ALLOWED_TRANSITIONS } from "./conversations.constants";
import type { CreateConversationInput, ListConversationsInput, UpdateConversationInput } from "./conversations.validator";
import type { LifecycleAction } from "./conversations.types";

export interface CurrentUser {
  sub: string;
  role: string;
}

// Shared by every nested module (messages, speakers, summaries, suggestions,
// subtitles, exports) that operates on /conversations/{id}/*.
export async function assertConversationAccess(
  conversationId: string,
  user: CurrentUser
): Promise<Conversation> {
  const conversation = await repo.findById(conversationId);
  if (!conversation) throw AppError.notFound("Conversation not found");
  if (conversation.ownerId !== user.sub && user.role !== "admin") {
    throw AppError.forbidden("You do not have access to this conversation");
  }
  return conversation;
}

export async function create(ownerId: string, input: CreateConversationInput) {
  return repo.createConversation({
    owner: { connect: { id: ownerId } },
    title: input.title,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
  });
}

export async function list(user: CurrentUser, query: ListConversationsInput) {
  const { page, limit, skip, take } = parsePagination(query);
  const { items, total } = await repo.listByOwner(
    user.sub,
    query.status ? { status: query.status } : {},
    skip,
    take
  );
  return { items, meta: { page, limit, total } };
}

export async function getById(conversationId: string, user: CurrentUser) {
  return assertConversationAccess(conversationId, user);
}

export async function update(
  conversationId: string,
  user: CurrentUser,
  input: UpdateConversationInput
) {
  await assertConversationAccess(conversationId, user);
  return repo.updateConversation(conversationId, input);
}

export async function remove(conversationId: string, user: CurrentUser) {
  await assertConversationAccess(conversationId, user);
  await repo.deleteConversation(conversationId);
}

export async function transition(
  conversationId: string,
  user: CurrentUser,
  action: LifecycleAction
) {
  const conversation = await assertConversationAccess(conversationId, user);
  const rule = ALLOWED_TRANSITIONS[action];

  if (!rule.from.includes(conversation.status)) {
    throw AppError.badRequest(
      `Cannot ${action} a conversation that is currently "${conversation.status}"`
    );
  }

  const timestamps: { startedAt?: Date; endedAt?: Date } = {};
  if (action === "start" && !conversation.startedAt) timestamps.startedAt = new Date();
  if (action === "end") timestamps.endedAt = new Date();

  return repo.updateStatus(conversationId, rule.to, timestamps);
}
