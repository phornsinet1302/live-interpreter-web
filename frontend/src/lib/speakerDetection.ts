export interface DetectedSpeaker {
  id: string;
  name: string;
  color: string;
  avgPitch: number;
  sampleCount: number;
}

const SPEAKER_LETTERS = "ABCDEFGHIJ";

export function defaultSpeakerName(index: number): string {
  return `Speaker ${SPEAKER_LETTERS[index] ?? index + 1}`;
}

// How close two pitch readings need to be (in Hz) to count as the same
// voice. Loose enough to absorb normal pitch variation within one person's
// speech, tight enough to usually separate an adult male from an adult
// female or a child — the two cases pitch-only detection actually handles
// well (see pitchDetection.ts).
const PITCH_MATCH_TOLERANCE_HZ = 25;

// Matches a new utterance's pitch reading against known speakers, updating
// that speaker's running average, or creates a new one — capped at
// colors.length so the UI never runs out of distinct colors/letters. A null
// pitch (too quiet/short a clip to get a reading) falls back to whoever
// spoke most recently rather than guessing wrong or spawning a phantom
// speaker from a noise blip.
export function matchOrCreateSpeaker(
  speakers: DetectedSpeaker[],
  pitch: number | null,
  colors: string[],
  lastSpeakerId?: string
): { speakers: DetectedSpeaker[]; matchedId: string } {
  if (speakers.length === 0) {
    const first: DetectedSpeaker = {
      id: `speaker-${Date.now()}`,
      name: defaultSpeakerName(0),
      color: colors[0],
      avgPitch: pitch ?? 150,
      sampleCount: pitch !== null ? 1 : 0,
    };
    return { speakers: [first], matchedId: first.id };
  }

  if (pitch === null) {
    const fallback = speakers.find((s) => s.id === lastSpeakerId) ?? speakers[speakers.length - 1];
    return { speakers, matchedId: fallback.id };
  }

  let best = speakers[0];
  let bestDiff = Math.abs(best.avgPitch - pitch);
  for (const s of speakers.slice(1)) {
    const diff = Math.abs(s.avgPitch - pitch);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = s;
    }
  }

  if (bestDiff <= PITCH_MATCH_TOLERANCE_HZ || speakers.length >= colors.length) {
    const updated = speakers.map((s) =>
      s.id === best.id
        ? {
            ...s,
            avgPitch: (s.avgPitch * s.sampleCount + pitch) / (s.sampleCount + 1),
            sampleCount: s.sampleCount + 1,
          }
        : s
    );
    return { speakers: updated, matchedId: best.id };
  }

  const next: DetectedSpeaker = {
    id: `speaker-${Date.now()}`,
    name: defaultSpeakerName(speakers.length),
    color: colors[speakers.length],
    avgPitch: pitch,
    sampleCount: 1,
  };
  return { speakers: [...speakers, next], matchedId: next.id };
}
