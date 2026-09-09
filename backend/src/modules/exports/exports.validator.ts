import { z } from "zod";

// File format is orthogonal to `type` (which content to include) and isn't
// modeled in the Export table — it only ever shows up as the extension on
// fileUrl — so it's validated here but never persisted as its own column.
export const createExportSchema = z.object({
  type: z.enum(["transcript", "summary", "audio", "full"]),
  format: z.enum(["pdf", "docx", "txt"]).default("txt"),
});
export type CreateExportInput = z.infer<typeof createExportSchema>;
export type ExportFormat = CreateExportInput["format"];
