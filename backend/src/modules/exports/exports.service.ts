import path from "node:path";
import { writeFile, unlink } from "node:fs/promises";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import * as repo from "./exports.repository";
import * as notificationsService from "../notifications/notifications.service";
import { getConversationForOwner } from "../conversations/conversations.service";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { ApiError } from "../../utils/api-error";
import type { Export, ExportType } from "../../lib/prisma-client";
import type { ExportFormat } from "./exports.validator";

const EXPORTS_DIR = path.join(env.uploadsDir, "exports");

// pdfkit's built-in fonts (Helvetica etc.) only cover WinAnsi/Latin-1 — any
// other script comes out as mojibake, not just tofu. Noto Sans covers
// Latin/Cyrillic/Greek/Vietnamese properly. Khmer needs its own font (Noto
// Sans Khmer) — pdfkit renders via fontkit, which does perform the complex
// script shaping Khmer's vowel/coeng reordering needs, so this isn't just
// glyph substitution. CJK/Arabic/Devanagari still aren't covered by either
// font here; those (and any other unsupported script) should still use the
// DOCX/TXT export, which store real Unicode text for the viewer's own fonts
// to render rather than embedding glyph outlines.
const PDF_FONT = path.join(__dirname, "..", "..", "assets", "fonts", "NotoSans.ttf");
const PDF_FONT_KHMER = path.join(__dirname, "..", "..", "assets", "fonts", "NotoSansKhmer.ttf");

// The Khmer Unicode block (U+1780-U+17FF covers the script itself; U+19E0-
// U+19FF is the rarely-used Khmer Symbols block for lunar-calendar marks) —
// checked per line rather than assuming one font for the whole document,
// since a single export mixes English/Khmer freely (original + translated
// side by side).
const KHMER_RANGE = /[ក-៿᧠-᧿]/;
function pickPdfFont(text: string): string {
  return KHMER_RANGE.test(text) ? PDF_FONT_KHMER : PDF_FONT;
}

// Shared, format-agnostic representation of an export's content — built once
// per request from the DB bundle, then handed to whichever renderer matches
// the requested format (renderTxt/renderPdf/renderDocx) so all three formats
// always agree on what's actually in the export.
interface ExportSection {
  heading: string;
  paragraphs: string[];
}
interface ExportDocument {
  title: string;
  sections: ExportSection[];
}

function buildTranscriptSection(
  bundle: NonNullable<Awaited<ReturnType<typeof repo.getExportBundle>>>
): ExportSection {
  const speakerLabel = (speakerId: string | null) =>
    bundle.speakers.find((s) => s.id === speakerId)?.displayName ??
    bundle.speakers.find((s) => s.id === speakerId)?.label ??
    "Unknown speaker";

  const paragraphs = bundle.messages.flatMap((m) => [
    `${speakerLabel(m.speakerId)} — ${m.createdAt.toISOString()}`,
    `Original (${m.sourceLanguage}): ${m.originalText}`,
    `Translated (${m.targetLanguage}): ${m.translatedText}`,
    "",
  ]);

  return { heading: "Transcript", paragraphs };
}

function buildSummarySection(
  bundle: NonNullable<Awaited<ReturnType<typeof repo.getExportBundle>>>
): ExportSection {
  if (!bundle.summary) {
    throw ApiError.badRequest("This conversation has no summary to export yet");
  }
  const keyPoints = (bundle.summary.keyPoints as string[]).map((p) => `- ${p}`);

  return {
    heading: "Summary",
    paragraphs: [bundle.summary.summary, "", "Key points:", ...keyPoints],
  };
}

async function buildDocument(type: ExportType, conversationId: string): Promise<ExportDocument> {
  const bundle = await repo.getExportBundle(conversationId);
  if (!bundle) throw ApiError.notFound("Conversation not found");

  if (type === "transcript") {
    return { title: bundle.title, sections: [buildTranscriptSection(bundle)] };
  }
  if (type === "summary") {
    return { title: bundle.title, sections: [buildSummarySection(bundle)] };
  }
  if (type === "full") {
    const sections: ExportSection[] = [
      {
        heading: "Speakers",
        paragraphs: bundle.speakers.map((s) => `- ${s.displayName ?? s.label} (${s.label})`),
      },
      buildTranscriptSection(bundle),
    ];
    try {
      sections.push(buildSummarySection(bundle));
    } catch {
      // No summary yet — a full export still makes sense without one.
    }
    return { title: bundle.title, sections };
  }
  throw new Error(`Unsupported export type for synchronous processing: ${type}`);
}

function renderTxt(doc: ExportDocument): Buffer {
  const parts = [doc.title, ""];
  for (const section of doc.sections) {
    parts.push(section.heading, "=".repeat(section.heading.length), ...section.paragraphs, "");
  }
  return Buffer.from(parts.join("\n"), "utf8");
}

function renderPdf(doc: ExportDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    pdf.on("data", (chunk) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    // One weight per script for everything (see PDF_FONT/PDF_FONT_KHMER
    // comments above) — headings are distinguished by size instead of a bold
    // instance, since picking a specific weight out of a variable font isn't
    // worth the complexity here. Font is chosen per line (not once for the
    // whole document) so a Khmer heading/paragraph next to an English one
    // each render in the font that actually has their glyphs.
    pdf.font(pickPdfFont(doc.title)).fontSize(20).text(doc.title);
    pdf.moveDown();
    for (const section of doc.sections) {
      pdf.font(pickPdfFont(section.heading)).fontSize(14).text(section.heading);
      pdf.moveDown(0.3);
      pdf.fontSize(10);
      for (const paragraph of section.paragraphs) {
        const text = paragraph.length ? paragraph : " ";
        pdf.font(pickPdfFont(text)).text(text);
      }
      pdf.moveDown();
    }
    pdf.end();
  });
}

async function renderDocx(doc: ExportDocument): Promise<Buffer> {
  const children: Paragraph[] = [new Paragraph({ text: doc.title, heading: HeadingLevel.TITLE })];
  for (const section of doc.sections) {
    children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_1 }));
    for (const paragraph of section.paragraphs) {
      children.push(new Paragraph({ text: paragraph }));
    }
  }
  const document = new Document({ sections: [{ children }] });
  return Packer.toBuffer(document);
}

async function renderFile(doc: ExportDocument, format: ExportFormat): Promise<Buffer> {
  if (format === "pdf") return renderPdf(doc);
  if (format === "docx") return renderDocx(doc);
  return renderTxt(doc);
}

export async function createExport(
  conversationId: string,
  userId: string,
  type: ExportType,
  format: ExportFormat
) {
  await getConversationForOwner(conversationId, userId);
  const record = await repo.create(conversationId, userId, type);

  if (type === "audio") {
    // No audio storage/pipeline exists anywhere in this system.
    await repo.updateStatus(record.id, "failed", null);
    return repo.findById(record.id) as Promise<Export>;
  }

  try {
    const doc = await buildDocument(type, conversationId);
    const filename = `${record.id}.${format}`;
    const file = await renderFile(doc, format);
    await writeFile(path.join(EXPORTS_DIR, filename), file);
    const updated = await repo.updateStatus(record.id, "completed", filename);

    await notificationsService.createForUser(userId, {
      title: "Export ready",
      message: `Your ${type} export is ready to download.`,
      type: "success",
      preferenceKey: "notifyExportCompleted",
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

export async function getDownloadPath(
  id: string,
  userId: string
): Promise<{ filePath: string; filename: string }> {
  const record = await getExport(id, userId);
  if (record.status !== "completed" || !record.fileUrl) {
    throw ApiError.conflict("This export is not ready for download");
  }

  // Best-effort friendly filename — falls back to a generic one if the
  // conversation was deleted out from under a still-existing export record.
  const conversation = await getConversationForOwner(record.conversationId, userId).catch(() => null);
  const extension = record.fileUrl.split(".").pop();
  const baseName = (conversation?.title ?? "conversation").replace(/[^\w\- ]+/g, "").trim() || "conversation";

  return {
    filePath: path.join(EXPORTS_DIR, record.fileUrl),
    filename: `${baseName}-${record.type}.${extension}`,
  };
}
