// Controller -> parse/validate req, call service, shape HTTP response. No DB, no rules.
import type { Request, Response } from "express";
import * as service from "./auth.service";
import * as usersService from "../users/users.service";
import { ApiError } from "../../utils/api-error";
import type {
  ForgotPasswordInput,
  GoogleLoginInput,
  LoginInput,
  LogoutInput,
  RefreshInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth.validator";

function deviceContext(req: Request) {
  return { ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

export async function register(req: Request, res: Response) {
  const input = req.body as RegisterInput;
  const { user } = await service.register(input, deviceContext(req));
  res.status(201).json({
    user: usersService.toPublicUser(user),
    message: "Account created. Check your email for a verification code.",
  });
}

export async function login(req: Request, res: Response) {
  const input = req.body as LoginInput;
  const { user, tokens } = await service.login(input, deviceContext(req));
  res.json({ user: usersService.toPublicUser(user), ...tokens });
}

export async function google(req: Request, res: Response) {
  const input = req.body as GoogleLoginInput;
  const { user, tokens } = await service.loginWithGoogle(input, deviceContext(req));
  res.json({ user: usersService.toPublicUser(user), ...tokens });
}

export async function refresh(req: Request, res: Response) {
  const input = req.body as RefreshInput;
  const tokens = await service.refresh(input, deviceContext(req));
  res.json(tokens);
}

export async function logout(req: Request, res: Response) {
  const input = req.body as LogoutInput;
  await service.logout(input.refreshToken);
  res.status(204).send();
}

export async function forgotPassword(req: Request, res: Response) {
  const input = req.body as ForgotPasswordInput;
  const devToken = await service.forgotPassword(input);
  res.json({
    message: "If an account exists for this email, a reset link has been sent.",
    ...(devToken ? { resetToken: devToken } : {}),
  });
}

export async function resetPassword(req: Request, res: Response) {
  const input = req.body as ResetPasswordInput;
  await service.resetPassword(input.token, input.newPassword);
  res.json({ message: "Password has been reset." });
}

export async function me(req: Request, res: Response) {
  const user = await usersService.getMe(req.user!.id);
  res.json(user);
}

// These two endpoints' request/response contract was specified externally
// (flat `{ message }` bodies, not this app's usual `{ error: {...} }`
// envelope) — see ApiError.flat(). Field-presence is checked here directly
// rather than via the shared `validate()` middleware so the 400 response
// matches that contract too instead of the app's per-field ZodError shape.
export async function verifyEmail(req: Request, res: Response) {
  const { email, code } = req.body as { email?: string; code?: string };
  if (!email || !code) {
    throw ApiError.flat(400, "Email and verification code are required.");
  }
  await service.verifyEmail(email, code);
  res.json({ message: "Email verified successfully." });
}

export async function resendVerificationCode(req: Request, res: Response) {
  const { email } = req.body as { email?: string };
  if (!email) {
    throw ApiError.flat(400, "Email is required.");
  }
  await service.resendVerificationCode(email);
  res.json({ message: "Verification code sent successfully." });
}
