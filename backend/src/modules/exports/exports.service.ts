// Service -> business rules & orchestration. Calls repository. No req/res.
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { AppError } from "../../utils/app-error";
import { logger } from "../../lib/logger";
import { assertConversationAccess, type CurrentUser } from "../conversations/conversations.service";
import * as repo from "./exports.repository";
import { formatTranscript } from "./exports.formatter";
import { EXPORTS_DIR, exportFilePath } from "./exports.constants";
import type { CreateExportInput } from "./exports.validator";

async function assertExportAccess(exportId: string, user: CurrentUser) {
  const exportRecord = await repo.findById(exportId);
  if (!exportRecord) throw AppError.notFound("Export not found");
  if (exportRecord.userId !== user.sub && user.role !== "admin") {
    throw AppError.forbidden("You do not have access to this export");
  }
  return exportRecord;
}

export async function create(conversationId: string, user: CurrentUser, input: CreateExportInput) {
  await assertConversationAccess(conversationId, user);

  const exportRecord = await repo.create({
    conversation: { connect: { id: conversationId } },
    user: { connect: { id: user.sub } },
    type: input.type,
    status: "processing",
  });

  try {
    const messages = await repo.listTranscript(conversationId);
    const content = formatTranscript(messages, input.type);

    await mkdir(EXPORTS_DIR, { recursive: true });
    await writeFile(exportFilePath(exportRecord.id, input.type), content, "utf-8");

    return repo.updateStatus(exportRecord.id, "completed", `/api/v1/exports/${exportRecord.id}/download`);
  } catch (err) {
    logger.error("Export generation failed", { exportId: exportRecord.id, error: String(err) });
    return repo.updateStatus(exportRecord.id, "failed");
  }
}

export async function get(exportId: string, user: CurrentUser) {
  return assertExportAccess(exportId, user);
}

export async function getDownloadPath(exportId: string, user: CurrentUser) {
  const exportRecord = await assertExportAccess(exportId, user);
  if (exportRecord.status !== "completed") {
    throw AppError.badRequest(`Export is not ready yet (status: ${exportRecord.status})`);
  }
  return {
    filePath: exportFilePath(exportRecord.id, exportRecord.type as "txt" | "srt"),
    fileName: `conversation-${exportRecord.conversationId}.${exportRecord.type}`,
  };
}

export async function remove(exportId: string, user: CurrentUser) {
  const exportRecord = await assertExportAccess(exportId, user);
  if (exportRecord.status === "completed") {
    await unlink(exportFilePath(exportRecord.id, exportRecord.type as "txt" | "srt")).catch(() => {});
  }
  await repo.remove(exportId);
}
