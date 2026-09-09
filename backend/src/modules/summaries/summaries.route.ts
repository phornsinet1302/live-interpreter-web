// Mounted at /conversations/:id/summary (see app.ts).
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { quickSummaryLimiter } from "../../middleware/rate-limit.middleware";
import { validate } from "../../middleware/validation.middleware";
import * as controller from "./summaries.controller";
import { quickSummarySchema, saveSummarySchema } from "./summaries.validator";

// Mounted at /summarize (see app.ts) — deliberately unauthenticated and not
// tied to a conversation, for the pre-signup live-translate demo. Nothing
// gets persisted; it's just quickSummarize() behind a rate limit.
export const quickSummaryRouter = Router();

/**
 * @openapi
 * /summarize:
 *   post:
 *     tags: [Summaries]
 *     summary: Summarize a transcript and suggest next steps (no auth, not persisted)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [exchanges, sourceLanguage, targetLanguage]
 *             properties:
 *               exchanges:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     source: { type: string }
 *                     translated: { type: string }
 *               sourceLanguage: { type: string, example: "English" }
 *               targetLanguage: { type: string, example: "Khmer" }
 *     responses:
 *       200: { description: Summary and next steps }
 */
quickSummaryRouter.post("/", quickSummaryLimiter, validate(quickSummarySchema), controller.quickSummary);

export const summariesRouter = Router({ mergeParams: true });

summariesRouter.use(authMiddleware);

/**
 * @openapi
 * /conversations/{id}/summary:
 *   post:
 *     tags: [Summaries]
 *     summary: Generate (or regenerate) the AI summary for a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       201: { description: Summary generated }
 *   get:
 *     tags: [Summaries]
 *     summary: Get the conversation's summary
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Summary }
 *       404: { description: No summary generated yet }
 *   delete:
 *     tags: [Summaries]
 *     summary: Delete the conversation's summary
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       204: { description: Deleted }
 */
summariesRouter.post("/", controller.create);

/**
 * @openapi
 * /conversations/{id}/summary:
 *   put:
 *     tags: [Summaries]
 *     summary: Set a conversation's summary directly (no AI call) — used to persist an already-generated live summary
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [summary]
 *             properties:
 *               summary: { type: string }
 *               keyPoints: { type: array, items: { type: string } }
 *               actionItems: { type: array, items: { type: string } }
 *               keywords: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Summary saved }
 */
summariesRouter.put("/", validate(saveSummarySchema), controller.save);
summariesRouter.get("/", controller.getById);
summariesRouter.delete("/", controller.remove);
