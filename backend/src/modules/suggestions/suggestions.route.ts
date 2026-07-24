// HTTP routes -> maps URLs to controller methods. No business logic here.
// Mounted at /conversations/:conversationId/suggestions
import { Router } from "express";
import * as controller from "./suggestions.controller";
import { requireAuth } from "../../middleware/auth.middleware";

export const suggestionsRouter = Router({ mergeParams: true });

suggestionsRouter.use(requireAuth);

/**
 * @openapi
 * /conversations/{conversationId}/suggestions:
 *   post:
 *     tags: [Suggestions]
 *     summary: Generate follow-up suggestions from the conversation so far
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: Suggestions generated }
 *   get:
 *     tags: [Suggestions]
 *     summary: List suggestions for a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Suggestions }
 */
suggestionsRouter.post("/", controller.generate);
suggestionsRouter.get("/", controller.list);
