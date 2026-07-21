// Service -> business rules & orchestration. Calls repository. No req/res.
import { Prisma } from "../../lib/prisma-client";
import { AppError } from "../../utils/app-error";
import { assertConversationAccess, type CurrentUser } from "../conversations/conversations.service";
import * as repo from "./subtitles.repository";
import { generateSessionCode } from "./subtitles.constants";
import type { CreateSubtitleSessionInput, UpdateSubtitleSessionInput } from "./subtitles.validator";

const MAX_CODE_ATTEMPTS = 5;

export async function create(conversationId: string, user: CurrentUser, input: CreateSubtitleSessionInput) {
  await assertConversationAccess(conversationId, user);

  const existing = await repo.findByConversation(conversationId);
  if (existing) throw AppError.conflict("A subtitle session already exists for this conversation");

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    try {
      return await repo.create({
        conversation: { connect: { id: conversationId } },
        sessionCode: generateSessionCode(),
        ...input,
      });
    } catch (err) {
      const isCodeCollision =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        (err.meta?.target as string[] | undefined)?.includes("session_code");
      if (!isCodeCollision) throw err;
    }
  }
  throw new Error("Failed to generate a unique subtitle session code");
}

export async function get(conversationId: string, user: CurrentUser) {
  await assertConversationAccess(conversationId, user);
  const session = await repo.findByConversation(conversationId);
  if (!session) throw AppError.notFound("No subtitle session for this conversation yet");
  return session;
}

export async function update(
  conversationId: string,
  user: CurrentUser,
  input: UpdateSubtitleSessionInput
) {
  await assertConversationAccess(conversationId, user);
  const existing = await repo.findByConversation(conversationId);
  if (!existing) throw AppError.notFound("No subtitle session for this conversation yet");
  return repo.update(conversationId, input);
}

export async function remove(conversationId: string, user: CurrentUser) {
  await assertConversationAccess(conversationId, user);
  await repo.remove(conversationId);
}
