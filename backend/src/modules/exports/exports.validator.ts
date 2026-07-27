import { z } from "zod";

export const createExportSchema = z.object({
  type: z.enum(["transcript", "summary", "audio", "full"]),
});
export type CreateExportInput = z.infer<typeof createExportSchema>;
