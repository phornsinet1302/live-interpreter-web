// Mounted at /conversations/:id/speakers (see app.ts).
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import * as controller from "./speakers.controller";
import { createSpeakerSchema, updateSpeakerSchema } from "./speakers.validator";

export const speakersRouter = Router({ mergeParams: true });

speakersRouter.use(authMiddleware);

/**
 * @openapi
 * /conversations/{id}/speakers:
 *   post:
 *     tags: [Speakers]
 *     summary: Register a speaker within a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [label]
 *             properties:
 *               label: { type: string, example: "Speaker A" }
 *               displayName: { type: string, example: "Dr. Smith" }
 *     responses:
 *       201: { description: Speaker created }
 *   get:
 *     tags: [Speakers]
 *     summary: List speakers for a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Speaker list }
 */
speakersRouter.post("/", validate(createSpeakerSchema), controller.create);
speakersRouter.get("/", controller.list);

/**
 * @openapi
 * /conversations/{id}/speakers/{speakerId}:
 *   patch:
 *     tags: [Speakers]
 *     summary: Rename/relabel a speaker
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *       - { name: speakerId, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label: { type: string }
 *               displayName: { type: string }
 *     responses:
 *       200: { description: Updated speaker }
 */
speakersRouter.patch("/:speakerId", validate(updateSpeakerSchema), controller.update);
