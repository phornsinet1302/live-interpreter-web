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

  clerk: {
    secretKey: required("CLERK_SECRET_KEY"),
    publishableKey: required("CLERK_PUBLISHABLE_KEY"),
  },

  openaiApiKey: process.env.OPENAI_API_KEY,
  googleApiKey: process.env.GOOGLE_API_KEY,

  // Vertex AI (Gemini) — auth is via ADC, not an API key, per org policy.
  gcp: {
    projectId: process.env.GCP_PROJECT_ID,
    location: process.env.GCP_LOCATION ?? "us-central1",
  },

  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  uploadsDir: path.join(__dirname, "..", "..", "uploads"),
} as const;
