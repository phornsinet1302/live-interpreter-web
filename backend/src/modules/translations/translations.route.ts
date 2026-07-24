// HTTP routes -> maps URLs to controller methods. No business logic here.
// Mounted at /conversations/:conversationId/messages
import { Router } from "express";
import * as controller from "./translations.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { createMessageSchema, listMessagesSchema } from "./translations.validator";

export const translationsRouter = Router({ mergeParams: true });

translationsRouter.use(requireAuth);

/**
 * @openapi
 * /conversations/{conversationId}/messages:
 *   post:
 *     tags: [Messages]
 *     summary: Speak a sentence and get it translated
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [originalText]
 *             properties:
 *               originalText: { type: string }
 *               speakerId: { type: string }
 *               sourceLanguage: { type: string }
 *               targetLanguage: { type: string }
 *     responses:
 *       201: { description: Message translated and stored }
 *   get:
 *     tags: [Messages]
 *     summary: List messages in a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated messages }
 */
translationsRouter.post("/", validate(createMessageSchema), controller.create);
translationsRouter.get("/", validate(listMessagesSchema, "query"), controller.list);

/**
 * @openapi
 * /conversations/{conversationId}/messages/{messageId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get a single message
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Message }
 *   delete:
 *     tags: [Messages]
 *     summary: Delete a message
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 */
translationsRouter.get("/:messageId", controller.getById);
translationsRouter.delete("/:messageId", controller.remove);
