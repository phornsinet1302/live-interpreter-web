import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validation.middleware";
import * as controller from "./notifications.controller";
import { broadcastSchema, listNotificationsQuerySchema } from "./notifications.validator";

export const notificationsRouter = Router();

notificationsRouter.use(authMiddleware);

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List the current user's notifications
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: isRead, in: query, schema: { type: boolean } }
 *       - { name: page, in: query, schema: { type: integer, default: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, default: 20 } }
 *     responses:
 *       200: { description: Paginated notification list }
 */
notificationsRouter.get(
  "/",
  validate(listNotificationsQuerySchema, "query"),
  controller.list
);

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Count of the current user's unread notifications
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unread count }
 */
notificationsRouter.get("/unread-count", controller.unreadCount);

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark every one of the current user's notifications as read
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Marked read }
 */
notificationsRouter.patch("/read-all", controller.markAllRead);

/**
 * @openapi
 * /notifications/broadcast:
 *   post:
 *     tags: [Notifications]
 *     summary: Send a system-update notification to every opted-in user (admin/moderator only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               title: { type: string }
 *               message: { type: string }
 *     responses:
 *       201: { description: Broadcast sent }
 *       403: { description: Insufficient permissions }
 */
notificationsRouter.post(
  "/broadcast",
  requireRole("admin", "moderator"),
  validate(broadcastSchema),
  controller.broadcast
);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated notification }
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
 *       - { name: id, in: path, required: true, schema: { type: string } }
 *     responses:
 *       204: { description: Deleted }
 */
notificationsRouter.delete("/:id", controller.remove);
