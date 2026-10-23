import path from "node:path";
import fs from "node:fs";

// Load .env sitting next to app.js if present (handy for local runs; on cPanel use the
// "Environment variables" section of Setup Node.js App instead).
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const baseDir = __dirname;
const migrationsDir = process.env.MIGRATIONS_DIR ?? path.join(baseDir, "migrations");
const staticDir = process.env.STATIC_DIR ?? path.join(baseDir, "public");

// cPanel's Passenger supplies the port itself; locally we default to 3000
const port = process.env.PORT ?? "3000";

async function main() {
  // Imported after .env is loaded because the db module reads DATABASE_URL on import
  const { runMigrations } = await import("@workspace/db");
  const { createApp } = await import("./app");
  const { logger } = await import("./lib/logger");

  logger.info({ migrationsDir }, "Applying database migrations");
  await runMigrations(migrationsDir);

  const app = createApp(staticDir);
  app.listen(port, () => {
    logger.info({ port, basePath: process.env.BASE_PATH }, "Server listening");
  });
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
