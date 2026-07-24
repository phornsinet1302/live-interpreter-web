import "dotenv/config";

// Central place to read + validate environment variables. Fail fast on boot
// rather than surfacing a cryptic error deep inside a request handler.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

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
    secret: process.env.PASSWORD_RESET_SECRET ?? required("JWT_ACCESS_SECRET"),
    expiry: process.env.PASSWORD_RESET_EXPIRY ?? "15m",
  },

  googleClientId: process.env.GOOGLE_CLIENT_ID,
  openaiApiKey: process.env.OPENAI_API_KEY,

  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim()),
};
