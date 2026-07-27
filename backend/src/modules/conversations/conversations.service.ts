import * as repo from "./conversations.repository";
import { ApiError } from "../../utils/api-error";
import { toSkipTake, paginated, type PaginationQuery } from "../../utils/pagination";
import { getIO } from "../../websocket/socket";
import { conversationRoom, SOCKET_EVENTS } from "../../websocket/events";
import type { Conversation, ConversationStatus } from "../../lib/prisma-client";
import type {
  ConversationTransition,
  CreateConversationInput,
  UpdateConversationInput,
} from "./conversations.types";

// Shared by every nested module (messages/summaries/speakers/suggestions/
// subtitles/exports) — the DB's RLS policies are inert against Prisma's
// connection role (see prisma/migrations/*/migration.sql), so this ownership
// check is the *only* real authorization enforcement in the system.
export async function getConversationForOwner(
  conversationId: string,
  userId: string
): Promise<Conversation> {
  const conversation = await repo.findById(conversationId);
  if (!conversation) {
    throw ApiError.notFound("Conversation not found");
  }
  if (conversation.ownerId !== userId) {
    throw ApiError.forbidden("You do not have access to this conversation");
  }
  return conversation;
}

export function createConversation(ownerId: string, input: CreateConversationInput) {
  return repo.create(ownerId, input);
}

export async function listConversations(
  ownerId: string,
  query: PaginationQuery & { status?: ConversationStatus }
) {
  const { page, limit, skip, take } = toSkipTake(query);
  const filters = query.status ? { status: query.status } : {};
  const [data, total] = await Promise.all([
    repo.findManyByOwner(ownerId, filters, skip, take),
    repo.countByOwner(ownerId, filters),
  ]);
  return paginated(data, total, page, limit);
}

export async function updateConversation(
  id: string,
  userId: string,
  input: UpdateConversationInput
) {
  await getConversationForOwner(id, userId);
  return repo.update(id, input);
}

export async function deleteConversation(id: string, userId: string) {
  await getConversationForOwner(id, userId);
  await repo.remove(id);
}

const ALLOWED_TRANSITIONS: Record<ConversationTransition, { from: ConversationStatus[]; to: ConversationStatus }> = {
  start: { from: ["waiting"], to: "active" },
  pause: { from: ["active"], to: "paused" },
  resume: { from: ["paused"], to: "active" },
  end: { from: ["active", "paused"], to: "ended" },
};

export async function transition(
  id: string,
  userId: string,
  action: ConversationTransition
) {
  const conversation = await getConversationForOwner(id, userId);
  const rule = ALLOWED_TRANSITIONS[action];
  if (!rule.from.includes(conversation.status)) {
    throw ApiError.conflict(
      `Cannot ${action} a conversation in status "${conversation.status}"`
    );
  }

  // started_at/ended_at are populated by the DB trigger
  // trigger_conversation_status_change (before-update, same statement).
  const updated = await repo.updateStatus(id, rule.to);

  getIO()?.to(conversationRoom(id)).emit(SOCKET_EVENTS.CONVERSATION_STATUS, {
    conversationId: id,
    status: updated.status,
    startedAt: updated.startedAt,
    endedAt: updated.endedAt,
  });

  return updated;
}
