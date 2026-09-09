import { mkdirSync } from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import { env } from "./config/env";
import { healthRouter } from "./modules/health/health.route";
import { usersRouter } from "./modules/users/users.route";
import { conversationsRouter } from "./modules/conversations/conversations.route";
import { quickTranslateRouter, translationsRouter } from "./modules/translations/translations.route";
import { quickTranscribeRouter } from "./modules/transcriptions/transcriptions.route";
import { quickSummaryRouter, summariesRouter } from "./modules/summaries/summaries.route";
import { quickNextStepRouter } from "./modules/next-step/next-step.route";
import { speakersRouter } from "./modules/speakers/speakers.route";
import { suggestionsRouter } from "./modules/suggestions/suggestions.route";
import { subtitlesRouter, publicSubtitlesRouter } from "./modules/subtitles/subtitles.route";
import { conversationExportsRouter, exportsRouter } from "./modules/exports/exports.route";
import { notificationsRouter } from "./modules/notifications/notifications.route";
import { remindersRouter } from "./modules/reminders/reminders.route";
import { analyticsRouter } from "./modules/analytics/analytics.route";
import { globalLimiter } from "./middleware/rate-limit.middleware";
import { apiUsageLogger } from "./middleware/api-usage-logger.middleware";
import { errorMiddleware } from "./middleware/error.middleware";

function ensureUploadsDirs() {
  mkdirSync(path.join(env.uploadsDir, "avatars"), { recursive: true });
  mkdirSync(path.join(env.uploadsDir, "exports"), { recursive: true });
}

export function createApp() {
  ensureUploadsDirs();

  const app = express();

  // Needed for express-rate-limit to read X-Forwarded-For correctly once
  // this sits behind a reverse proxy/PaaS; a bare `true` would make the
  // limiter trust every hop, so this only applies in production.
  if (env.isProduction) {
    app.set("trust proxy", 1);
  }

  // exposedHeaders: Content-Disposition carries the export's real filename
  // (see modules/exports) — without this, browsers hide it from JS on
  // cross-origin responses and the frontend falls back to a generic name.
  app.use(cors({ origin: env.corsOrigins, exposedHeaders: ["Content-Disposition"] }));
  // 10mb (up from Express's 100kb default) to fit base64-encoded audio clips
  // from the quick-transcribe endpoint.
  app.use(express.json({ limit: "10mb" }));
  // Populates per-request auth state (read via getAuth(req) in
  // auth.middleware.ts) from the session token — cheap local JWT
  // verification against Clerk's cached JWKS, harmless on public routes.
  app.use(clerkMiddleware({ secretKey: env.clerk.secretKey, publishableKey: env.clerk.publishableKey }));
  app.use(apiUsageLogger);

  // Public avatar images only — export files are never statically served
  // (see modules/exports), since they can contain full private transcripts.
  app.use("/uploads/avatars", express.static(path.join(env.uploadsDir, "avatars")));

  // --- API routes (versioned) ---
  const v1 = express.Router();
  v1.use(globalLimiter);
  v1.use(healthRouter); //                            GET  /api/v1/health
  v1.use("/users", usersRouter); //                    /api/v1/users/*
  v1.use("/conversations", conversationsRouter); //    /api/v1/conversations*
  v1.use("/translate", quickTranslateRouter); //        /api/v1/translate (public)
  v1.use("/transcribe", quickTranscribeRouter); //       /api/v1/transcribe (public)
  v1.use("/summarize", quickSummaryRouter); //           /api/v1/summarize (public)
  v1.use("/next-step", quickNextStepRouter); //          /api/v1/next-step (public)
  v1.use("/conversations/:id/messages", translationsRouter);
  v1.use("/conversations/:id/summary", summariesRouter);
  v1.use("/conversations/:id/speakers", speakersRouter);
  v1.use("/conversations/:id/suggestions", suggestionsRouter);
  v1.use("/conversations/:id/subtitles", subtitlesRouter);
  v1.use("/subtitles", publicSubtitlesRouter); //       /api/v1/subtitles/:code (public)
  v1.use("/conversations/:id/exports", conversationExportsRouter);
  v1.use("/exports", exportsRouter); //                /api/v1/exports/*
  v1.use("/notifications", notificationsRouter); //    /api/v1/notifications*
  v1.use("/reminders", remindersRouter); //             /api/v1/reminders*
  v1.use("/analytics", analyticsRouter); //             /api/v1/analytics/*
  app.use("/api/v1", v1);

  // --- Swagger UI ---
  // Interactive docs:   http://localhost:PORT/api/docs
  // Raw OpenAPI JSON:   http://localhost:PORT/api/docs.json
  app.get("/api/docs.json", (_req, res) => {
    res.json(swaggerSpec);
  });
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "Live Interpreter API Docs",
    })
  );

  app.use(errorMiddleware);

  return app;
}
