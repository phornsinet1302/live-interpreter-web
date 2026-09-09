import { z } from "zod";

// Unauthenticated, not tied to a conversation — used by the live-translate
// demo's mid-session "what to say next" nudge (see LiveTranslate.tsx). Only
// sourceLanguage is needed since the suggestion must come back in the main
// speaker's own language, never the translation.
export const quickNextStepSchema = z.object({
  exchanges: z
    .array(
      z.object({
        source: z.string().min(1).max(2000),
        translated: z.string().min(1).max(2000),
      })
    )
    .min(1)
    .max(200),
  sourceLanguage: z.string().min(2).max(30),
});
export type QuickNextStepInput = z.infer<typeof quickNextStepSchema>;
