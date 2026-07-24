// HTTP routes -> maps URLs to controller methods. No business logic here.
// Mounted at /conversations/:conversationId/subtitles
import { Router } from "express";
import * as controller from "./subtitles.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { createSubtitleSessionSchema, updateSubtitleSessionSchema } from "./subtitles.validator";

export const subtitlesRouter = Router({ mergeParams: true });

subtitlesRouter.use(requireAuth);

/**
 * @openapi
 * /conversations/{conversationId}/subtitles:
 *   post:
 *     tags: [Subtitles]
 *     summary: Start a public subtitle session for this conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: Subtitle session created }
 *   get:
 *     tags: [Subtitles]
 *     summary: Get the subtitle session config
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Subtitle session }
 *   patch:
 *     tags: [Subtitles]
 *     summary: Update subtitle appearance/status
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated subtitle session }
 *   delete:
 *     tags: [Subtitles]
 *     summary: End the subtitle session
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 */
subtitlesRouter.post("/", validate(createSubtitleSessionSchema), controller.create);
subtitlesRouter.get("/", controller.get);
subtitlesRouter.patch("/", validate(updateSubtitleSessionSchema), controller.update);
subtitlesRouter.delete("/", controller.remove);
