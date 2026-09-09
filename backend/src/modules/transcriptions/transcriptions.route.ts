import { Router } from "express";
import { quickTranscribeLimiter } from "../../middleware/rate-limit.middleware";
import { validate } from "../../middleware/validation.middleware";
import * as controller from "./transcriptions.controller";
import { quickTranscribeSchema } from "./transcriptions.validator";

// Mounted at /transcribe (see app.ts) — deliberately unauthenticated and not
// tied to a conversation, for the pre-signup live-translate demo's
// Gemini-based speech path (see LiveTranslate.tsx's useGeminiTranscription).
// Nothing gets persisted; it's just transcribeAudio() behind a rate limit.
export const quickTranscribeRouter = Router();

/**
 * @openapi
 * /transcribe:
 *   post:
 *     tags: [Messages]
 *     summary: Transcribe a short audio clip (no auth, not persisted)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [audio, mimeType, sourceLanguage]
 *             properties:
 *               audio: { type: string, description: "Base64-encoded audio clip" }
 *               mimeType: { type: string, example: "audio/webm;codecs=opus" }
 *               sourceLanguage: { type: string, example: "Khmer" }
 *     responses:
 *       200: { description: Transcribed text }
 */
quickTranscribeRouter.post(
  "/",
  quickTranscribeLimiter,
  validate(quickTranscribeSchema),
  controller.quickTranscribe
);
