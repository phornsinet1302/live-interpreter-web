import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import * as controller from "./exports.controller";
import { createExportSchema } from "./exports.validator";

// Mounted at /conversations/:id/exports (see app.ts) — creation is scoped to
// a conversation the caller owns.
export const conversationExportsRouter = Router({ mergeParams: true });
conversationExportsRouter.use(authMiddleware);

/**
 * @openapi
 * /conversations/{id}/exports:
 *   post:
 *     tags: [Exports]
 *     summary: Request an export of a conversation (processed synchronously)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type: { type: string, enum: [transcript, summary, audio, full] }
 *     responses:
 *       201: { description: Export created (status reflects processing result) }
 */
conversationExportsRouter.post("/", validate(createExportSchema), controller.create);

// Mounted at /exports (see app.ts) — these routes carry no conversationId in
// the path at all, so access is checked directly against the export's own
// user_id (set at creation time) rather than re-deriving it from a parent
// conversation.
export const exportsRouter = Router();
exportsRouter.use(authMiddleware);

/**
 * @openapi
 * /exports/{id}:
 *   get:
 *     tags: [Exports]
 *     summary: Get an export's status/metadata
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Export }
 *   delete:
 *     tags: [Exports]
 *     summary: Delete an export (and its file, if any)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       204: { description: Deleted }
 */
exportsRouter.get("/:id", controller.getById);
exportsRouter.delete("/:id", controller.remove);

/**
 * @openapi
 * /exports/{id}/download:
 *   get:
 *     tags: [Exports]
 *     summary: Download a completed export's file
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: File stream }
 *       409: { description: Export not ready for download }
 */
exportsRouter.get("/:id/download", controller.download);
