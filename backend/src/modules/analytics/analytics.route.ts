// HTTP routes -> maps URLs to controller methods. No business logic here.
import { Router } from "express";
import * as controller from "./analytics.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validation.middleware";
import { rangeQuerySchema } from "./analytics.validator";

export const analyticsRouter = Router();

// Platform-wide stats — admin only.
analyticsRouter.use(requireAuth, requireRole("admin"));

/**
 * @openapi
 * /analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Platform overview counts
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dashboard counts }
 */
analyticsRouter.get("/dashboard", controller.dashboard);

/**
 * @openapi
 * /analytics/translations:
 *   get:
 *     tags: [Analytics]
 *     summary: Daily translation volume
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200: { description: Translation volume by day }
 */
analyticsRouter.get("/translations", validate(rangeQuerySchema, "query"), controller.translations);

/**
 * @openapi
 * /analytics/languages:
 *   get:
 *     tags: [Analytics]
 *     summary: Most common source/target language pairs
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Language pair counts }
 */
analyticsRouter.get("/languages", controller.languages);

/**
 * @openapi
 * /analytics/users:
 *   get:
 *     tags: [Analytics]
 *     summary: User growth and role breakdown
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200: { description: User stats }
 */
analyticsRouter.get("/users", validate(rangeQuerySchema, "query"), controller.users);

/**
 * @openapi
 * /analytics/api-usage:
 *   get:
 *     tags: [Analytics]
 *     summary: API request volume and latency
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200: { description: API usage stats }
 */
analyticsRouter.get("/api-usage", validate(rangeQuerySchema, "query"), controller.apiUsage);
