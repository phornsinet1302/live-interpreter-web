import path from "node:path";

export const EXPORT_TYPES = ["txt", "srt"] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];

// backend/uploads/exports — same relative depth from src/ (dev via tsx) and
// dist/ (built), since both modules/exports directories sit two levels deep.
export const EXPORTS_DIR = path.join(__dirname, "..", "..", "..", "uploads", "exports");

export function exportFilePath(exportId: string, type: ExportType): string {
  return path.join(EXPORTS_DIR, `${exportId}.${type}`);
}
