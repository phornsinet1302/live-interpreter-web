import { z } from "zod";

// Unauthenticated, not tied to a conversation — used to summarize the
// pre-signup live-translate demo transcript. Capped well below a real
// conversation's likely length to keep the cost of abuse low.
export const quickSummarySchema = z.object({
  exchanges: z
    .array(
      z.object({
        source: z.string().min(1).max(2000),
        translated: z.string().min(1).max(2000),
        // Optional — lets the summary attribute discussion points and
        // produce a per-speaker breakdown (FR-4) when FR-8's speaker
        // identification tagged the live session's entries.
        speakerName: z.string().min(1).max(100).optional(),
      })
    )
    .min(1)
    .max(200),
  sourceLanguage: z.string().min(2).max(30),
  targetLanguage: z.string().min(2).max(30),
});
export type QuickSummaryInput = z.infer<typeof quickSummarySchema>;

// Sets a conversation's summary directly, from a client-supplied payload —
// used to persist the (Gemini-generated, already shown to the user) live
// quick-summary as-is when a session is saved, instead of paying for and
// waiting on a second, independent OpenAI regeneration (see
// createOrRegenerateSummary) that would likely say something slightly
// different from what the user already saw and approved by saving.
export const saveSummarySchema = z.object({
  summary: z.string().min(1).max(4000),
  keyPoints: z.array(z.string().min(1).max(500)).max(20).default([]),
  actionItems: z.array(z.string().min(1).max(500)).max(20).default([]),
  keywords: z.array(z.string().min(1).max(100)).max(20).default([]),
});
export type SaveSummaryInput = z.infer<typeof saveSummarySchema>;
