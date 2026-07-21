// HTTP routes -> maps URLs to controller methods. No business logic here.
import { Router } from "express";
import * as controller from "./notifications.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { listNotificationsSchema } from "./notifications.validator";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List my notifications
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Paginated notifications }
 */
notificationsRouter.get("/", validate(listNotificationsSchema, "query"), controller.list);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notification marked as read }
 */
notificationsRouter.patch("/:id/read", controller.markRead);

/**
 * @openapi
 * /notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete a notification
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 */
notificationsRouter.delete("/:id", controller.remove);
