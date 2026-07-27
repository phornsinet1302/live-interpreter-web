import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import * as controller from "./analytics.controller";

export const analyticsRouter = Router();

analyticsRouter.use(authMiddleware);

/**
 * @openapi
 * /analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Aggregate stats for the current user's own conversations
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dashboard stats }
 */
analyticsRouter.get("/dashboard", controller.dashboard);

/**
 * @openapi
 * /analytics/translations:
 *   get:
 *     tags: [Analytics]
 *     summary: Translation counts by provider/day for the current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Translation stats }
 */
analyticsRouter.get("/translations", controller.translations);

/**
 * @openapi
 * /analytics/languages:
 *   get:
 *     tags: [Analytics]
 *     summary: Most-used source/target language pairs for the current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Language pair stats }
 */
analyticsRouter.get("/languages", controller.languages);

/**
 * @openapi
 * /analytics/users:
 *   get:
 *     tags: [Analytics]
 *     summary: Platform-wide user stats (admin/moderator only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User stats }
 *       403: { description: Insufficient permissions }
 */
analyticsRouter.get("/users", requireRole("admin", "moderator"), controller.users);

/**
 * @openapi
 * /analytics/api-usage:
 *   get:
 *     tags: [Analytics]
 *     summary: Platform-wide API usage stats (admin/moderator only)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: API usage stats }
 *       403: { description: Insufficient permissions }
 */
analyticsRouter.get("/api-usage", requireRole("admin", "moderator"), controller.apiUsage);
