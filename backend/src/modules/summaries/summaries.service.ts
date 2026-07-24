// Service -> business rules & orchestration. Calls repository + provider. No req/res.
import { AppError } from "../../utils/app-error";
import { assertConversationAccess, type CurrentUser } from "../conversations/conversations.service";
import * as repo from "./summaries.repository";
import { generateSummary } from "./summaries.provider";

export async function generate(conversationId: string, user: CurrentUser) {
  await assertConversationAccess(conversationId, user);

  const messages = await repo.listTranscript(conversationId);
  if (messages.length === 0) {
    throw AppError.badRequest("This conversation has no messages to summarize yet");
  }

  const transcript = messages
    .map((m) => `${m.originalText}${m.translatedText ? ` (translated: ${m.translatedText})` : ""}`)
    .join("\n");

  const generated = await generateSummary(transcript);
  return repo.upsertSummary(conversationId, {
    summary: generated.summary,
    keyPoints: generated.keyPoints,
    actionItems: generated.actionItems,
    keywords: generated.keywords,
  });
}

export async function get(conversationId: string, user: CurrentUser) {
  await assertConversationAccess(conversationId, user);
  const summary = await repo.findByConversation(conversationId);
  if (!summary) throw AppError.notFound("No summary has been generated for this conversation yet");
  return summary;
}

export async function remove(conversationId: string, user: CurrentUser) {
  await assertConversationAccess(conversationId, user);
  await repo.deleteSummary(conversationId);
}
