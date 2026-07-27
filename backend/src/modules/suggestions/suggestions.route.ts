// Mounted at /conversations/:id/suggestions (see app.ts).
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import * as controller from "./suggestions.controller";

export const suggestionsRouter = Router({ mergeParams: true });

suggestionsRouter.use(authMiddleware);

/**
 * @openapi
 * /conversations/{id}/suggestions:
 *   post:
 *     tags: [Suggestions]
 *     summary: Generate AI-suggested follow-up actions
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       201: { description: Suggestions generated }
 *   get:
 *     tags: [Suggestions]
 *     summary: List suggested actions for a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Suggestions ordered by priority }
 */
suggestionsRouter.post("/", controller.create);
suggestionsRouter.get("/", controller.list);
