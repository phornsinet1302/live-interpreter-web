import "dotenv/config";
import path from "node:path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Central place to read + validate environment variables.
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT ?? 4000),

  databaseUrl: required("DATABASE_URL"),

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET"),
    refreshSecret: required("JWT_REFRESH_SECRET"),
    accessExpiry: process.env.JWT_ACCESS_EXPIRY ?? "15m",
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? "30d",
  },

  passwordReset: {
    secret: required("PASSWORD_RESET_SECRET"),
    expiry: process.env.PASSWORD_RESET_EXPIRY ?? "15m",
  },

  googleClientId: process.env.GOOGLE_CLIENT_ID,
  openaiApiKey: process.env.OPENAI_API_KEY,

  // Gmail SMTP via nodemailer. GMAIL_APP_PASSWORD is a 16-character Google
  // "App Password" (requires 2-Step Verification on the account), not the
  // account's real password.
  gmailUser: process.env.GMAIL_USER,
  // Google displays app passwords with cosmetic spaces (e.g. "abcd efgh
  // ijkl mnop") — strip them, since the real credential has none.
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ""),

  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  uploadsDir: path.join(__dirname, "..", "..", "uploads"),
} as const;
