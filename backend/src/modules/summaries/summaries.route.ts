// HTTP routes -> maps URLs to controller methods. No business logic here.
// Mounted at /conversations/:conversationId/summary
import { Router } from "express";
import * as controller from "./summaries.controller";
import { requireAuth } from "../../middleware/auth.middleware";

export const summariesRouter = Router({ mergeParams: true });

summariesRouter.use(requireAuth);

/**
 * @openapi
 * /conversations/{conversationId}/summary:
 *   post:
 *     tags: [Summaries]
 *     summary: Generate (or regenerate) the AI summary for a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: Summary generated }
 *   get:
 *     tags: [Summaries]
 *     summary: Get the conversation's summary
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Summary }
 *       404: { description: No summary yet }
 *   delete:
 *     tags: [Summaries]
 *     summary: Delete the conversation's summary
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 */
summariesRouter.post("/", controller.generate);
summariesRouter.get("/", controller.get);
summariesRouter.delete("/", controller.remove);
