// HTTP routes -> maps URLs to controller methods. No business logic here.
import { Router } from "express";
import * as controller from "./conversations.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import {
  createConversationSchema,
  listConversationsSchema,
  updateConversationSchema,
} from "./conversations.validator";

export const conversationsRouter = Router();

conversationsRouter.use(requireAuth);

/**
 * @openapi
 * /conversations:
 *   post:
 *     tags: [Conversations]
 *     summary: Start a new conversation
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sourceLanguage, targetLanguage]
 *             properties:
 *               title: { type: string }
 *               sourceLanguage: { type: string, example: en }
 *               targetLanguage: { type: string, example: km }
 *     responses:
 *       201: { description: Conversation created }
 *   get:
 *     tags: [Conversations]
 *     summary: List my conversations
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [waiting, active, paused, ended] }
 *     responses:
 *       200: { description: Paginated conversations }
 */
conversationsRouter.post("/", validate(createConversationSchema), controller.create);
conversationsRouter.get("/", validate(listConversationsSchema, "query"), controller.list);

/**
 * @openapi
 * /conversations/{id}:
 *   get:
 *     tags: [Conversations]
 *     summary: Get a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Conversation }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Conversations]
 *     summary: Update a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated conversation }
 *   delete:
 *     tags: [Conversations]
 *     summary: Delete a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 */
conversationsRouter.get("/:id", controller.getById);
conversationsRouter.patch("/:id", validate(updateConversationSchema), controller.update);
conversationsRouter.delete("/:id", controller.remove);

/**
 * @openapi
 * /conversations/{id}/start:
 *   patch:
 *     tags: [Conversations]
 *     summary: Start the conversation (waiting -> active)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Conversation started }
 * /conversations/{id}/pause:
 *   patch:
 *     tags: [Conversations]
 *     summary: Pause the conversation (active -> paused)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Conversation paused }
 * /conversations/{id}/resume:
 *   patch:
 *     tags: [Conversations]
 *     summary: Resume the conversation (paused -> active)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Conversation resumed }
 * /conversations/{id}/end:
 *   patch:
 *     tags: [Conversations]
 *     summary: End the conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Conversation ended }
 */
conversationsRouter.patch("/:id/start", controller.start);
conversationsRouter.patch("/:id/pause", controller.pause);
conversationsRouter.patch("/:id/resume", controller.resume);
conversationsRouter.patch("/:id/end", controller.end);
