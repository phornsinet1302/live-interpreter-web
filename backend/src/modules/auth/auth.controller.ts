// Controller -> parse/validate req, call service, shape HTTP response. No DB, no rules.
import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { created, ok } from "../../utils/api-response";
import { AppError } from "../../utils/app-error";
import { recordAudit } from "../../lib/audit";
import * as service from "./auth.service";
import type {
  ForgotPasswordInput,
  GoogleAuthInput,
  LoginInput,
  LogoutInput,
  RefreshInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth.validator";

function requestMeta(req: Request) {
  return { ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.register(req.body as RegisterInput, requestMeta(req));
  recordAudit(req, "register", "user", result.user.id);
  return created(res, result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.login(req.body as LoginInput, requestMeta(req));
  recordAudit(req, "login", "user", result.user.id);
  return ok(res, result);
});

export const google = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.loginWithGoogle(req.body as GoogleAuthInput, requestMeta(req));
  recordAudit(req, "login_google", "user", result.user.id);
  return ok(res, result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as RefreshInput;
  const tokens = await service.refresh(refreshToken, requestMeta(req));
  return ok(res, tokens);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as LogoutInput;
  await service.logout(refreshToken);
  return ok(res, { message: "Logged out" });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.forgotPassword(req.body as ForgotPasswordInput);
  return ok(res, { message: "If that email exists, a reset link has been sent", ...result });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await service.resetPassword(req.body as ResetPasswordInput);
  return ok(res, { message: "Password reset successfully" });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const user = await service.getMe(req.user.sub);
  return ok(res, user);
});
