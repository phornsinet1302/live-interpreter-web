// HTTP routes -> maps URLs to controller methods. No business logic here.
import { Router } from "express";
import * as controller from "./users.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { updateAvatarSchema, updatePasswordSchema, updateProfileSchema } from "./users.validator";

export const usersRouter = Router();

usersRouter.use(requireAuth);

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get my profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user profile }
 *   put:
 *     tags: [Users]
 *     summary: Update my profile
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               preferredLanguage: { type: string }
 *               theme: { type: string, enum: [light, dark, system] }
 *     responses:
 *       200: { description: Updated profile }
 *   delete:
 *     tags: [Users]
 *     summary: Delete my account (soft delete)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Account deleted }
 */
usersRouter.get("/me", controller.getMe);
usersRouter.put("/me", validate(updateProfileSchema), controller.updateMe);
usersRouter.delete("/me", controller.deleteMe);

/**
 * @openapi
 * /users/me/avatar:
 *   patch:
 *     tags: [Users]
 *     summary: Update my avatar
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [avatarUrl]
 *             properties:
 *               avatarUrl: { type: string, format: uri }
 *     responses:
 *       200: { description: Updated profile }
 */
usersRouter.patch("/me/avatar", validate(updateAvatarSchema), controller.updateAvatar);

/**
 * @openapi
 * /users/me/password:
 *   patch:
 *     tags: [Users]
 *     summary: Change my password
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Password updated }
 *       401: { description: Current password is incorrect }
 */
usersRouter.patch("/me/password", validate(updatePasswordSchema), controller.updatePassword);
