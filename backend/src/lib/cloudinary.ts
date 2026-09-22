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
