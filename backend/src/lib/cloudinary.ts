import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";

const isConfigured = Boolean(
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

// Deterministic public_id per user + overwrite:true means every re-upload
// replaces the same Cloudinary asset in place — no separate "delete the old
// one" step to keep in sync with the DB, unlike the old local-disk version.
export async function uploadAvatar(userId: string, buffer: Buffer): Promise<string> {
  if (!isConfigured) {
    throw new ApiError(
      503,
      "Avatar uploads aren't configured on this server (missing Cloudinary credentials)",
      "SERVICE_UNAVAILABLE"
    );
  }

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: `avatars/${userId}`,
        overwrite: true,
        invalidate: true,
        resource_type: "image",
      },
      (error, uploadResult) => {
        if (error || !uploadResult) reject(error ?? new Error("Cloudinary upload returned no result"));
        else resolve(uploadResult);
      }
    );
    stream.end(buffer);
  });

  return result.secure_url;
}

// Deterministic public_id per export + format, same overwrite:true pattern as
// uploadAvatar above — keeps Cloudinary as the source of truth instead of
// local disk, which Render (and most PaaS hosts) wipes on every
// redeploy/restart.
function exportPublicId(exportId: string, format: string): string {
  return `exports/${exportId}.${format}`;
}

export async function uploadExportFile(
  exportId: string,
  format: string,
  buffer: Buffer
): Promise<void> {
  if (!isConfigured) {
    throw new ApiError(
      503,
      "Export storage isn't configured on this server (missing Cloudinary credentials)",
      "SERVICE_UNAVAILABLE"
    );
  }

  await new Promise<void>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: exportPublicId(exportId, format),
        resource_type: "raw",
        overwrite: true,
        invalidate: true,
      },
      (error) => {
        if (error) reject(error);
        else resolve();
      }
    );
    stream.end(buffer);
  });
}

export async function deleteExportFile(exportId: string, format: string): Promise<void> {
  if (!isConfigured) return;
  await cloudinary.uploader
    .destroy(exportPublicId(exportId, format), { resource_type: "raw" })
    .catch(() => {
      // Best-effort — matches the local-disk unlink().catch() this replaced.
    });
}

// fl_attachment:<filename> makes Cloudinary serve the raw file with a
// Content-Disposition that names it after the conversation rather than the
// public_id, without us having to proxy the bytes through this server.
export function exportDownloadUrl(exportId: string, format: string, filename: string): string {
  return cloudinary.url(exportPublicId(exportId, format), {
    resource_type: "raw",
    type: "upload",
    flags: `attachment:${filename}`,
    sign_url: false,
  });
}
