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
      })
    )
    .min(1)
    .max(200),
  sourceLanguage: z.string().min(2).max(30),
  targetLanguage: z.string().min(2).max(30),
});
export type QuickSummaryInput = z.infer<typeof quickSummarySchema>;
