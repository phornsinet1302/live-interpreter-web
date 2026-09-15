import * as repo from "./speakers.repository";
import { getConversationForOwner } from "../conversations/conversations.service";
import { ApiError } from "../../utils/api-error";
import { logger } from "../../lib/logger";
import { gemini } from "../../lib/gemini";
import { getIO } from "../../websocket/socket";
import { conversationRoom, SOCKET_EVENTS } from "../../websocket/events";
import type { CreateSpeakerInput, IdentifySpeakerInput, UpdateSpeakerInput } from "./speakers.validator";

const IDENTIFY_MODEL = "gemini-3.5-flash-lite";

function labelForIndex(index: number): string {
  // 0 -> "Speaker A", 1 -> "Speaker B", ... wraps to AA/AB/... past Z, which
  // in practice never happens for a live conversation's participant count.
  let n = index;
  let letters = "";
  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Speaker ${letters}`;
}

// Not a voice-biometric match — Gemini is asked to compare the new clip's
// voice characteristics (pitch, tone, cadence) against short reference clips
// from speakers already seen in this conversation. Good enough to tell apart
// clearly different voices in a small group; can misfire on similar-sounding
// ones. Reference audio never leaves this function or gets returned to
// clients — it's read, compared, and (for a new speaker) persisted for the
// next comparison, nothing more.
export async function identifySpeaker(
  conversationId: string,
  userId: string,
  input: IdentifySpeakerInput
) {
  await getConversationForOwner(conversationId, userId);
  const known = await repo.findManyWithReference(conversationId);

  if (known.length === 0) {
    const speaker = await repo.createWithReference(conversationId, {
      label: labelForIndex(0),
      referenceAudio: input.audio,
      referenceAudioMimeType: input.mimeType,
    });
    return { ...speaker, isNew: true };
  }

  let matchLabel: string | null = null;
  try {
    const contents = [
      { text: "Reference voice samples, one per already-identified speaker:" },
      ...known.flatMap((s) => [
        { text: `Reference — ${s.label}:` },
        { inlineData: { mimeType: s.referenceAudioMimeType!, data: s.referenceAudio! } },
      ]),
      { text: "New clip — determine whether this is the same person as one of the references above:" },
      { inlineData: { mimeType: input.mimeType, data: input.audio } },
    ];

    const response = await gemini.models.generateContent({
      model: IDENTIFY_MODEL,
      contents,
      config: {
        systemInstruction:
          "You are comparing short voice recordings to tell whether the same person is speaking. Judge only by " +
          "voice characteristics — pitch, tone, cadence, accent — never by what is said. Respond ONLY with JSON of " +
          'the shape {"matchLabel": string | null} — matchLabel is the exact label of the matching reference ' +
          "speaker if you're reasonably confident it's the same voice, or null if it's a different voice or you're unsure.",
        responseMimeType: "application/json",
      },
    });

    const raw = response.text;
    if (raw) {
      const parsed = JSON.parse(raw) as { matchLabel?: string | null };
      matchLabel = parsed.matchLabel ?? null;
    }
  } catch (error) {
    logger.error("Speaker identification request failed", error);
    // Fall through as "no match" — better to occasionally split one speaker
    // into two labels than to throw and lose the segment's speaker entirely.
  }

  const match = matchLabel ? known.find((s) => s.label === matchLabel) : undefined;
  if (match) {
    const { referenceAudio: _ref, referenceAudioMimeType: _mime, ...speaker } = match;
    return { ...speaker, isNew: false };
  }

  const speaker = await repo.createWithReference(conversationId, {
    label: labelForIndex(known.length),
    referenceAudio: input.audio,
    referenceAudioMimeType: input.mimeType,
  });
  return { ...speaker, isNew: true };
}

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
