import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { apiRateLimiter } from "./middleware/rate-limit.middleware";
import { apiUsageMiddleware } from "./middleware/api-usage.middleware";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";

import { healthRouter } from "./modules/health/health.route";
import { authRouter } from "./modules/auth/auth.route";
import { usersRouter } from "./modules/users/users.route";
import { conversationsRouter } from "./modules/conversations/conversations.route";
import { translationsRouter } from "./modules/translations/translations.route";
import { speakersRouter } from "./modules/speakers/speakers.route";
import { summariesRouter } from "./modules/summaries/summaries.route";
import { suggestionsRouter } from "./modules/suggestions/suggestions.route";
import { subtitlesRouter } from "./modules/subtitles/subtitles.route";
import { exportsCreateRouter, exportsRouter } from "./modules/exports/exports.route";
import { notificationsRouter } from "./modules/notifications/notifications.route";
import { analyticsRouter } from "./modules/analytics/analytics.route";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json());
  app.use(apiRateLimiter);
  app.use(apiUsageMiddleware);

  // --- API routes (versioned) ---
  const v1 = express.Router();
  v1.use(healthRouter); //                                    GET  /api/v1/health
  v1.use("/auth", authRouter); //                              *   /api/v1/auth/*
  v1.use("/users", usersRouter); //                            *   /api/v1/users/*
  v1.use("/conversations", conversationsRouter); //            *   /api/v1/conversations/*

  // Nested under a conversation:
  v1.use("/conversations/:conversationId/messages", translationsRouter);
  v1.use("/conversations/:conversationId/speakers", speakersRouter);
  v1.use("/conversations/:conversationId/summary", summariesRouter);
  v1.use("/conversations/:conversationId/suggestions", suggestionsRouter);
  v1.use("/conversations/:conversationId/subtitles", subtitlesRouter);
  v1.use("/conversations/:conversationId/exports", exportsCreateRouter);

  v1.use("/exports", exportsRouter); //                        *   /api/v1/exports/*
  v1.use("/notifications", notificationsRouter); //            *   /api/v1/notifications/*
  v1.use("/analytics", analyticsRouter); //                    *   /api/v1/analytics/*

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

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
