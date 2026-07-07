import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Schema lives at the repo root (../prisma), shared across the project.
// With a config file present, Prisma no longer auto-loads .env, so we do it
// explicitly above via "dotenv/config" (reads backend/.env).
export default defineConfig({
  schema: path.join(__dirname, "..", "prisma", "schema.prisma"),
});
