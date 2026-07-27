import path from "node:path";
import { writeFile, unlink } from "node:fs/promises";
import * as repo from "./exports.repository";
import * as notificationsRepo from "../notifications/notifications.repository";
import { getConversationForOwner } from "../conversations/conversations.service";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { ApiError } from "../../utils/api-error";
import type { Export, ExportType } from "../../lib/prisma-client";

const EXPORTS_DIR = path.join(env.uploadsDir, "exports");

function buildTranscript(bundle: NonNullable<Awaited<ReturnType<typeof repo.getExportBundle>>>): string {
  const speakerLabel = (speakerId: string | null) =>
    bundle.speakers.find((s) => s.id === speakerId)?.displayName ??
    bundle.speakers.find((s) => s.id === speakerId)?.label ??
    "Unknown speaker";

  return bundle.messages
    .map(
      (m) =>
        `[${m.createdAt.toISOString()}] ${speakerLabel(m.speakerId)}\n` +
        `  Original (${m.sourceLanguage}): ${m.originalText}\n` +
        `  Translated (${m.targetLanguage}): ${m.translatedText}\n`
    )
    .join("\n");
}

function buildSummary(bundle: NonNullable<Awaited<ReturnType<typeof repo.getExportBundle>>>): string {
  if (!bundle.summary) {
    throw ApiError.badRequest("This conversation has no summary to export yet");
  }
  const keyPoints = (bundle.summary.keyPoints as string[]).map((p) => `- ${p}`).join("\n");
  const keywords = (bundle.summary.keywords as string[]).join(", ");
  return `Summary\n=======\n${bundle.summary.summary}\n\nKey points:\n${keyPoints}\n\nKeywords: ${keywords}\n`;
}

async function buildContent(
  type: ExportType,
  conversationId: string
): Promise<string> {
  const bundle = await repo.getExportBundle(conversationId);
  if (!bundle) throw ApiError.notFound("Conversation not found");

  if (type === "transcript") return buildTranscript(bundle);
  if (type === "summary") return buildSummary(bundle);
  if (type === "full") {
    const speakers = bundle.speakers
      .map((s) => `- ${s.displayName ?? s.label} (${s.label})`)
      .join("\n");
    let content = `Conversation: ${bundle.title}\n\nSpeakers\n========\n${speakers}\n\n`;
    content += `Transcript\n==========\n${buildTranscript(bundle)}\n`;
    try {
      content += `\n${buildSummary(bundle)}`;
    } catch {
      // No summary yet — a full export still makes sense without one.
    }
    return content;
  }
  throw new Error(`Unsupported export type for synchronous processing: ${type}`);
}

export async function createExport(conversationId: string, userId: string, type: ExportType) {
  await getConversationForOwner(conversationId, userId);
  const record = await repo.create(conversationId, userId, type);

  if (type === "audio") {
    // No audio storage/pipeline exists anywhere in this system.
    await repo.updateStatus(record.id, "failed", null);
    return repo.findById(record.id) as Promise<Export>;
  }

  try {
    const content = await buildContent(type, conversationId);
    const filename = `${record.id}.txt`;
    await writeFile(path.join(EXPORTS_DIR, filename), content, "utf8");
    const updated = await repo.updateStatus(record.id, "completed", filename);

    await notificationsRepo.create({
      userId,
      title: "Export ready",
      message: `Your ${type} export is ready to download.`,
      type: "success",
    });

    return updated;
  } catch (error) {
    logger.error("Export processing failed", error);
    await repo.updateStatus(record.id, "failed", null);
    return repo.findById(record.id) as Promise<Export>;
  }
}

export async function getExport(id: string, userId: string): Promise<Export> {
  const record = await repo.findById(id);
  if (!record || record.userId !== userId) {
    throw ApiError.notFound("Export not found");
  }
  return record;
}

export async function deleteExport(id: string, userId: string) {
  const record = await getExport(id, userId);
  if (record.fileUrl) {
    await unlink(path.join(EXPORTS_DIR, record.fileUrl)).catch((error) =>
      logger.warn("Failed to remove export file", error)
    );
  }
  await repo.remove(id);
}

export async function getDownloadPath(id: string, userId: string): Promise<string> {
  const record = await getExport(id, userId);
  if (record.status !== "completed" || !record.fileUrl) {
    throw ApiError.conflict("This export is not ready for download");
  }
  return path.join(EXPORTS_DIR, record.fileUrl);
}
