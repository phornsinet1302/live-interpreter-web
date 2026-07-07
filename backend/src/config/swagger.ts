import path from "node:path";
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Live Interpreter API",
      version: "1.0.0",
      description:
        "REST API for the Live Interpreter platform (consumed by the web and mobile apps).",
    },
    // All documented paths are relative to this base URL.
    servers: [{ url: "/api/v1", description: "API v1" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  // Files scanned for `@openapi` JSDoc blocks. Every module route file is included.
  apis: [
    path.join(__dirname, "..", "modules", "**", "*.route.ts"),
    path.join(__dirname, "..", "modules", "**", "*.route.js"),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
