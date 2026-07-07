import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import { healthRouter } from "./modules/health/health.route";
import { authRouter } from "./modules/auth/auth.route";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // --- API routes (versioned) ---
  const v1 = express.Router();
  v1.use(healthRouter); //            GET  /api/v1/health
  v1.use("/auth", authRouter); //     POST /api/v1/auth/*
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

  return app;
}
