// HTTP routes -> maps URLs to controller methods. No business logic here.
import { Router } from "express";
import * as controller from "./auth.controller";
import { validate } from "../../middleware/validation.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { authRateLimiter } from "../../middleware/rate-limit.middleware";
import {
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.validator";

export const authRouter = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Create an account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Jane Doe }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               preferredLanguage: { type: string, example: en }
 *     responses:
 *       201: { description: Account created }
 *       409: { description: Email already in use }
 */
authRouter.post("/register", authRateLimiter, validate(registerSchema), controller.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and receive tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: user@example.com }
 *               password: { type: string, minLength: 8, example: "password123" }
 *     responses:
 *       200: { description: Logged in successfully }
 *       401: { description: Invalid credentials }
 */
authRouter.post("/login", authRateLimiter, validate(loginSchema), controller.login);

/**
 * @openapi
 * /auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Log in (or sign up) with a Google ID token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken: { type: string }
 *     responses:
 *       200: { description: Logged in successfully }
 *       401: { description: Invalid Google token }
 */
authRouter.post("/google", authRateLimiter, validate(googleAuthSchema), controller.google);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a refresh token for a new token pair
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: New tokens issued }
 *       401: { description: Invalid or expired refresh token }
 */
authRouter.post("/refresh", validate(refreshSchema), controller.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke a refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Logged out }
 */
authRouter.post("/logout", validate(logoutSchema), controller.logout);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Reset instructions sent if the email exists }
 */
authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validate(forgotPasswordSchema),
  controller.forgotPassword
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset a password using a reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Password reset successfully }
 *       401: { description: Invalid or expired reset token }
 */
authRouter.post(
  "/reset-password",
  authRateLimiter,
  validate(resetPasswordSchema),
  controller.resetPassword
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Not authenticated }
 */
authRouter.get("/me", requireAuth, controller.me);
