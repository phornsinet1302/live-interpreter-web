// Mounted at /conversations/:id/summary (see app.ts).
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import * as controller from "./summaries.controller";

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
summariesRouter.get("/", controller.getById);
summariesRouter.delete("/", controller.remove);
