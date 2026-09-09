import { Router } from "express";
import { quickNextStepLimiter } from "../../middleware/rate-limit.middleware";
import { validate } from "../../middleware/validation.middleware";
import * as controller from "./next-step.controller";
import { quickNextStepSchema } from "./next-step.validator";

// Mounted at /next-step (see app.ts) — deliberately unauthenticated and not
// tied to a conversation, for the live-translate demo's mid-session "what to
// say next" nudge. Nothing gets persisted.
export const quickNextStepRouter = Router();

/**
 * @openapi
 * /next-step:
 *   post:
 *     tags: [Summaries]
 *     summary: Suggest one short next thing to say, in the speaker's language (no auth, not persisted)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [exchanges, sourceLanguage]
 *             properties:
 *               exchanges:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     source: { type: string }
 *                     translated: { type: string }
 *               sourceLanguage: { type: string, example: "English" }
 *     responses:
 *       200: { description: A single next-step suggestion }
 */
quickNextStepRouter.post(
  "/",
  quickNextStepLimiter,
  validate(quickNextStepSchema),
  controller.quickNextStep
);
