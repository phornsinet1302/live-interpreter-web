// Mounted at /conversations/:id/subtitles (see app.ts).
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import * as controller from "./subtitles.controller";
import {
  createSubtitleSessionSchema,
  pushSubtitleTextSchema,
  updateSubtitleSessionSchema,
} from "./subtitles.validator";

export const subtitlesRouter = Router({ mergeParams: true });

subtitlesRouter.use(authMiddleware);

/**
 * @openapi
 * /conversations/{id}/subtitles:
 *   post:
 *     tags: [Subtitles]
 *     summary: Start a new subtitle display session (retires any previous one)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fontSize: { type: integer, minimum: 1, maximum: 72, example: 16 }
 *               fontColor: { type: string, example: "#FFFFFF" }
 *               backgroundColor: { type: string, example: "#000000" }
 *     responses:
 *       201: { description: Subtitle session created }
 *   get:
 *     tags: [Subtitles]
 *     summary: Get the current/most recent subtitle session
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Subtitle session }
 *   patch:
 *     tags: [Subtitles]
 *     summary: Update subtitle display settings
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fontSize: { type: integer, minimum: 1, maximum: 72 }
 *               fontColor: { type: string }
 *               backgroundColor: { type: string }
 *               status: { type: string, enum: [active, inactive, expired] }
 *     responses:
 *       200: { description: Updated subtitle session }
 *   delete:
 *     tags: [Subtitles]
 *     summary: Remove the current subtitle session
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       204: { description: Deleted }
 */
subtitlesRouter.post("/", validate(createSubtitleSessionSchema), controller.create);
subtitlesRouter.get("/", controller.getById);
subtitlesRouter.patch("/", validate(updateSubtitleSessionSchema), controller.update);
subtitlesRouter.delete("/", controller.remove);

/**
 * @openapi
 * /conversations/{id}/subtitles/push:
 *   post:
 *     tags: [Subtitles]
 *     summary: Push a finalized caption line to whoever's watching (not persisted)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [source, translated]
 *             properties:
 *               source: { type: string }
 *               translated: { type: string }
 *               speakerName: { type: string }
 *     responses:
 *       202: { description: Relayed }
 *       409: { description: No active subtitle session for this conversation }
 */
subtitlesRouter.post("/push", validate(pushSubtitleTextSchema), controller.push);

// Mounted at /subtitles (see app.ts) — deliberately unauthenticated: a
// second-display viewer only ever has the shareable sessionCode, not an
// account. Exposes display settings only (see subtitles.service.getByCode).
export const publicSubtitlesRouter = Router();

/**
 * @openapi
 * /subtitles/{code}:
 *   get:
 *     tags: [Subtitles]
 *     summary: Get a subtitle session's display settings by its shareable code (no auth)
 *     parameters:
 *       - { name: code, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Display settings }
 *       404: { description: No subtitle session found for this code }
 */
publicSubtitlesRouter.get("/:code", controller.getByCode);
