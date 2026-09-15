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

// Dev-only: on top of the explicit CORS_ORIGINS allowlist, also accept any
// private-network origin (192.168.x.x, 10.x.x.x, 172.16-31.x.x) on any port —
// that's how a phone on the same Wi-Fi reaches the dev server, and its IP
// isn't known ahead of time the way localhost:<port> is. Never used in
// production (see the isProduction check at the call site), where only the
// explicit allowlist applies.
const PRIVATE_LAN_HOSTNAME = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

// The browser extension's background/offscreen contexts fetch this API
// directly from a chrome-extension://<id> (or moz-extension://<id> in
// Firefox) origin — allowed unconditionally since an unpacked extension's id
// isn't known ahead of time the way localhost:<port> is, this endpoint set
// takes no cookies (Clerk auth is a bearer token, not cookie-based) so
// there's no CSRF-style risk in allowing it broadly, and a request that
// falls through this check crashes with a raw 500 instead of a clean CORS
// rejection (see corsOriginCheck below) — which is exactly what silently
// broke both the highlight-to-translate popover and the live tab-audio
// interpreter until this was added.
const EXTENSION_ORIGIN = /^(chrome|moz)-extension:\/\//;

function corsOriginCheck(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
  if (!origin) return callback(null, true); // same-origin / non-browser requests
  if (env.corsOrigins.includes(origin)) return callback(null, true);
  if (EXTENSION_ORIGIN.test(origin)) return callback(null, true);
  try {
    if (PRIVATE_LAN_HOSTNAME.test(new URL(origin).hostname)) return callback(null, true);
  } catch {
    // Malformed origin header — fall through to rejection below.
  }
  callback(new Error(`Origin not allowed by CORS: ${origin}`));
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
  app.use(
    cors({
      origin: env.isProduction ? env.corsOrigins : corsOriginCheck,
      exposedHeaders: ["Content-Disposition"],
    })
  );
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
