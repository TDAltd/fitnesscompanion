import { defineConfig } from "drizzle-kit";

// Paths are relative to lib/db (run via `pnpm --filter @workspace/db run generate`)
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost/unused",
  },
});
