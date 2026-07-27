// HTTP routes -> maps URLs to controller methods. No business logic here.
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import * as controller from "./conversations.controller";
import {
  createConversationSchema,
  listConversationsQuerySchema,
  updateConversationSchema,
} from "./conversations.validator";

export const conversationsRouter = Router();

conversationsRouter.use(authMiddleware);

/**
 * @openapi
 * /conversations:
 *   post:
 *     tags: [Conversations]
 *     summary: Create a conversation
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sourceLanguage, targetLanguage]
 *             properties:
 *               title: { type: string, example: "Client meeting" }
 *               sourceLanguage: { type: string, example: "en" }
 *               targetLanguage: { type: string, example: "km" }
 *     responses:
 *       201: { description: Conversation created }
 *   get:
 *     tags: [Conversations]
 *     summary: List the current user's conversations
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: status, in: query, schema: { type: string, enum: [waiting, active, paused, ended, archived] } }
 *       - { name: page, in: query, schema: { type: integer, default: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, default: 20 } }
 *     responses:
 *       200: { description: Paginated conversation list }
 */
conversationsRouter.post("/", validate(createConversationSchema), controller.create);
conversationsRouter.get(
  "/",
  validate(listConversationsQuerySchema, "query"),
  controller.list
);

/**
 * @openapi
 * /conversations/{id}:
 *   get:
 *     tags: [Conversations]
 *     summary: Get a conversation by id
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Conversation }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Conversations]
 *     summary: Update a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               sourceLanguage: { type: string }
 *               targetLanguage: { type: string }
 *     responses:
 *       200: { description: Updated conversation }
 *   delete:
 *     tags: [Conversations]
 *     summary: Delete a conversation (hard delete, cascades)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
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
 *     summary: Start a waiting conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Conversation now active }
 *       409: { description: Invalid state transition }
 * /conversations/{id}/pause:
 *   patch:
 *     tags: [Conversations]
 *     summary: Pause an active conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Conversation now paused }
 *       409: { description: Invalid state transition }
 * /conversations/{id}/resume:
 *   patch:
 *     tags: [Conversations]
 *     summary: Resume a paused conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Conversation now active }
 *       409: { description: Invalid state transition }
 * /conversations/{id}/end:
 *   patch:
 *     tags: [Conversations]
 *     summary: End an active or paused conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Conversation now ended }
 *       409: { description: Invalid state transition }
 */
conversationsRouter.patch("/:id/start", controller.start);
conversationsRouter.patch("/:id/pause", controller.pause);
conversationsRouter.patch("/:id/resume", controller.resume);
conversationsRouter.patch("/:id/end", controller.end);
