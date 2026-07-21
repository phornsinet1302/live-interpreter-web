// HTTP routes -> maps URLs to controller methods. No business logic here.
// Mounted at /conversations/:conversationId/speakers
import { Router } from "express";
import * as controller from "./speakers.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { createSpeakerSchema, updateSpeakerSchema } from "./speakers.validator";

export const speakersRouter = Router({ mergeParams: true });

speakersRouter.use(requireAuth);

/**
 * @openapi
 * /conversations/{conversationId}/speakers:
 *   post:
 *     tags: [Speakers]
 *     summary: Register a detected speaker
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: Speaker created }
 *   get:
 *     tags: [Speakers]
 *     summary: List speakers in a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Speakers }
 */
speakersRouter.post("/", validate(createSpeakerSchema), controller.create);
speakersRouter.get("/", controller.list);

/**
 * @openapi
 * /conversations/{conversationId}/speakers/{speakerId}:
 *   patch:
 *     tags: [Speakers]
 *     summary: Update a speaker (e.g. rename)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: speakerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated speaker }
 */
speakersRouter.patch("/:speakerId", validate(updateSpeakerSchema), controller.update);
