// HTTP routes -> maps URLs to controller methods. No business logic here.
import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { env } from "../../config/env";
import { ApiError } from "../../utils/api-error";
import * as controller from "./users.controller";
import { updateProfileSchema } from "./users.validator";

export const usersRouter = Router();

usersRouter.use(authMiddleware);

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: path.join(env.uploadsDir, "avatars"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${req.user!.id}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(ApiError.badRequest("Only image uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get the current user's profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: The current user }
 *   put:
 *     tags: [Users]
 *     summary: Update the current user's profile
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               preferredLanguage: { type: string, example: "en" }
 *               theme: { type: string, enum: [light, dark, system] }
 *     responses:
 *       200: { description: Updated user }
 *   delete:
 *     tags: [Users]
 *     summary: Soft-delete the current user's account
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
 *     summary: Upload a new avatar image
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar: { type: string, format: binary }
 *     responses:
 *       200: { description: Updated user }
 */
usersRouter.patch("/me/avatar", avatarUpload.single("avatar"), controller.updateAvatar);
