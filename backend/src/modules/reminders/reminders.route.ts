// Mounted at /reminders (see app.ts).
import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import * as controller from "./reminders.controller";
import { createReminderSchema, listRemindersQuerySchema } from "./reminders.validator";

export const remindersRouter = Router();

remindersRouter.use(authMiddleware);

/**
 * @openapi
 * /reminders:
 *   post:
 *     tags: [Reminders]
 *     summary: Schedule a reminder notification for a future time
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message, remindAt]
 *             properties:
 *               message: { type: string, example: "Follow up on the contract" }
 *               remindAt: { type: string, format: date-time }
 *     responses:
 *       201: { description: Reminder scheduled }
 *   get:
 *     tags: [Reminders]
 *     summary: List the current user's scheduled reminders
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: page, in: query, schema: { type: integer, default: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, default: 20 } }
 *     responses:
 *       200: { description: Paginated reminder list }
 */
remindersRouter.post("/", validate(createReminderSchema), controller.create);
remindersRouter.get("/", validate(listRemindersQuerySchema, "query"), controller.list);

/**
 * @openapi
 * /reminders/{id}:
 *   delete:
 *     tags: [Reminders]
 *     summary: Cancel a scheduled reminder
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       204: { description: Cancelled }
 */
remindersRouter.delete("/:id", controller.remove);
