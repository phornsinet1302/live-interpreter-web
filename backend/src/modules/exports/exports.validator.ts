import { z } from "zod";
import { EXPORT_TYPES } from "./exports.constants";

export const createExportSchema = z.object({
  type: z.enum(EXPORT_TYPES),
});
export type CreateExportInput = z.infer<typeof createExportSchema>;
