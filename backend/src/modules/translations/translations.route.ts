// Mounted at /conversations/:id/messages (see app.ts) — mergeParams gives
// this router access to :id from the parent path.
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { quickTranslateLimiter } from "../../middleware/rate-limit.middleware";
import { validate } from "../../middleware/validation.middleware";
import * as controller from "./translations.controller";
import { createMessageSchema, listMessagesQuerySchema, quickTranslateSchema } from "./translations.validator";

// Mounted at /translate (see app.ts) — deliberately unauthenticated and not
// tied to a conversation, for the pre-signup live-translate demo. Nothing
// gets persisted; it's just translateText() behind a stricter rate limit.
export const quickTranslateRouter = Router();

/**
 * @openapi
 * /translate:
 *   post:
 *     tags: [Messages]
 *     summary: Translate a single piece of text (no auth, not persisted)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text, sourceLanguage, targetLanguage]
 *             properties:
 *               text: { type: string, example: "Hello, how are you?" }
 *               sourceLanguage: { type: string, example: "English" }
 *               targetLanguage: { type: string, example: "Khmer" }
 *     responses:
 *       200: { description: Translated text }
 */
quickTranslateRouter.post(
  "/",
  quickTranslateLimiter,
  validate(quickTranslateSchema),
  controller.quickTranslate
);

export const translationsRouter = Router({ mergeParams: true });

translationsRouter.use(authMiddleware);

/**
 * @openapi
 * /conversations/{id}/messages:
 *   post:
 *     tags: [Messages]
 *     summary: Add a spoken sentence and get its translation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [originalText]
 *             properties:
 *               originalText: { type: string, example: "Hello, how are you?" }
 *               speakerId: { type: string }
 *               sourceLanguage: { type: string, description: "Defaults to the conversation's sourceLanguage" }
 *               targetLanguage: { type: string, description: "Defaults to the conversation's targetLanguage" }
 *     responses:
 *       201: { description: Message created and translated }
 *   get:
 *     tags: [Messages]
 *     summary: List messages for a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *       - { name: page, in: query, schema: { type: integer, default: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, default: 50 } }
 *     responses:
 *       200: { description: Paginated message list }
 */
translationsRouter.post("/", validate(createMessageSchema), controller.create);
translationsRouter.get("/", validate(listMessagesQuerySchema, "query"), controller.list);

/**
 * @openapi
 * /conversations/{id}/messages/{messageId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get a single message
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *       - { name: messageId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Message }
 *   delete:
 *     tags: [Messages]
 *     summary: Delete a message
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *       - { name: messageId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       204: { description: Deleted }
 */
translationsRouter.get("/:messageId", controller.getById);
translationsRouter.delete("/:messageId", controller.remove);
