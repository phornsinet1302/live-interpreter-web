// HTTP routes -> maps URLs to controller methods. No business logic here.
import { Router } from "express";
import * as controller from "./exports.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { createExportSchema } from "./exports.validator";

// Mounted at /conversations/:conversationId/exports
export const exportsCreateRouter = Router({ mergeParams: true });
exportsCreateRouter.use(requireAuth);

/**
 * @openapi
 * /conversations/{conversationId}/exports:
 *   post:
 *     tags: [Exports]
 *     summary: Export a conversation transcript
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
 *             required: [type]
 *             properties:
 *               type: { type: string, enum: [txt, srt] }
 *     responses:
 *       201: { description: Export created }
 */
exportsCreateRouter.post("/", validate(createExportSchema), controller.create);

// Mounted at /exports
export const exportsRouter = Router();
exportsRouter.use(requireAuth);

/**
 * @openapi
 * /exports/{id}:
 *   get:
 *     tags: [Exports]
 *     summary: Get export status
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Export }
 *   delete:
 *     tags: [Exports]
 *     summary: Delete an export
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 */
exportsRouter.get("/:id", controller.get);
exportsRouter.delete("/:id", controller.remove);

/**
 * @openapi
 * /exports/{id}/download:
 *   get:
 *     tags: [Exports]
 *     summary: Download the exported file
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: File stream }
 *       400: { description: Export is not ready yet }
 */
exportsRouter.get("/:id/download", controller.download);
