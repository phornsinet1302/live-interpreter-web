import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "./logger";

const transporter =
  env.gmailUser && env.gmailAppPassword
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: env.gmailUser, pass: env.gmailAppPassword },
      })
    : null;

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    // No GMAIL_USER/GMAIL_APP_PASSWORD configured — fall back to logging so
    // local/dev flows still work without a real mailbox.
    logger.warn(`Gmail SMTP not configured; email to ${to} was not sent`, { subject });
    return;
  }

  try {
    await transporter.sendMail({ from: env.gmailUser, to, subject, html });
  } catch (error) {
    logger.error(`Failed to send email to ${to}`, error);
  }
}

export function sendVerificationCodeEmail(to: string, code: string): Promise<void> {
  return send(
    to,
    "Verify your email",
    `<p>Your verification code is:</p>
     <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>
     <p>This code expires in 10 minutes.</p>`
  );
}

export function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  return send(
    to,
    "Reset your password",
    `<p>Use this token to reset your password:</p>
     <p style="font-size: 18px; font-weight: bold;">${token}</p>
     <p>If you didn't request this, you can ignore this email.</p>`
  );
}
