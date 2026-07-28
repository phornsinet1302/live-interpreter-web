import { mkdirSync } from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import { env } from "./config/env";
import { healthRouter } from "./modules/health/health.route";
import { authRouter } from "./modules/auth/auth.route";
import { usersRouter } from "./modules/users/users.route";
import { conversationsRouter } from "./modules/conversations/conversations.route";
import { quickTranslateRouter, translationsRouter } from "./modules/translations/translations.route";
import { summariesRouter } from "./modules/summaries/summaries.route";
import { speakersRouter } from "./modules/speakers/speakers.route";
import { suggestionsRouter } from "./modules/suggestions/suggestions.route";
import { subtitlesRouter } from "./modules/subtitles/subtitles.route";
import { conversationExportsRouter, exportsRouter } from "./modules/exports/exports.route";
import { notificationsRouter } from "./modules/notifications/notifications.route";
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

  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json());
  app.use(apiUsageLogger);

  // Public avatar images only — export files are never statically served
  // (see modules/exports), since they can contain full private transcripts.
  app.use("/uploads/avatars", express.static(path.join(env.uploadsDir, "avatars")));

  // --- API routes (versioned) ---
  const v1 = express.Router();
  v1.use(globalLimiter);
  v1.use(healthRouter); //                            GET  /api/v1/health
  v1.use("/auth", authRouter); //                      /api/v1/auth/*
  v1.use("/users", usersRouter); //                    /api/v1/users/*
  v1.use("/conversations", conversationsRouter); //    /api/v1/conversations*
  v1.use("/translate", quickTranslateRouter); //        /api/v1/translate (public)
  v1.use("/conversations/:id/messages", translationsRouter);
  v1.use("/conversations/:id/summary", summariesRouter);
  v1.use("/conversations/:id/speakers", speakersRouter);
  v1.use("/conversations/:id/suggestions", suggestionsRouter);
  v1.use("/conversations/:id/subtitles", subtitlesRouter);
  v1.use("/conversations/:id/exports", conversationExportsRouter);
  v1.use("/exports", exportsRouter); //                /api/v1/exports/*
  v1.use("/notifications", notificationsRouter); //    /api/v1/notifications*
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
