import type { ConversationMessage, Speaker } from "../../lib/prisma-client";
import type { ExportType } from "./exports.constants";

type MessageWithSpeaker = ConversationMessage & { speaker: Speaker | null };

function srtTimestamp(seconds: number): string {
  const ms = Math.floor((seconds % 1) * 1000);
  const totalSeconds = Math.floor(seconds);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

// No per-message audio timing is captured, so each line gets a fixed 4s
// window in playback order — good enough for a readable transcript export.
const SECONDS_PER_LINE = 4;

function toSrt(messages: MessageWithSpeaker[]): string {
  return messages
    .map((m, i) => {
      const start = srtTimestamp(i * SECONDS_PER_LINE);
      const end = srtTimestamp((i + 1) * SECONDS_PER_LINE);
      const speaker = m.speaker?.displayName ?? m.speaker?.label;
      const text = speaker ? `${speaker}: ${m.translatedText ?? m.originalText}` : m.translatedText ?? m.originalText;
      return `${i + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join("\n");
}

function toTxt(messages: MessageWithSpeaker[]): string {
  return messages
    .map((m) => {
      const speaker = m.speaker?.displayName ?? m.speaker?.label ?? "Speaker";
      const time = m.createdAt.toISOString();
      return `[${time}] ${speaker} (${m.sourceLanguage}): ${m.originalText}\n${" ".repeat(2)}-> (${m.targetLanguage}): ${m.translatedText ?? ""}`;
    })
    .join("\n\n");
}

export function formatTranscript(messages: MessageWithSpeaker[], type: ExportType): string {
  return type === "srt" ? toSrt(messages) : toTxt(messages);
}
