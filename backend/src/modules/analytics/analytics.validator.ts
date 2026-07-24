import { z } from "zod";

export const rangeQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});
export type RangeQueryInput = z.infer<typeof rangeQuerySchema>;
