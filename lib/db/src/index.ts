import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { migrate as migrateNeon } from "drizzle-orm/neon-serverless/migrator";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import pg from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Add it in cPanel > Setup Node.js App > Environment variables (or in .env for local dev).",
  );
}

/**
 * DB_DRIVER=pg   (default) normal Postgres connection on port 5432.
 * DB_DRIVER=neon connects to a Neon database over WebSockets on port 443.
 *                Use this if your host blocks outgoing connections on port 5432
 *                (common on shared hosting).
 */
const driver = (process.env.DB_DRIVER ?? "pg").toLowerCase();

type DB = NodePgDatabase<typeof schema>;

let db: DB;
let runMigrations: (migrationsFolder: string) => Promise<void>;
let closeDb: () => Promise<void>;

if (driver === "neon") {
  neonConfig.webSocketConstructor = ws;
  const pool = new NeonPool({ connectionString: process.env.DATABASE_URL, max: 5 });
  const neonDb = drizzleNeon(pool, { schema });
  db = neonDb as unknown as DB;
  runMigrations = (migrationsFolder) => migrateNeon(neonDb, { migrationsFolder });
  closeDb = () => pool.end();
} else {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  db = drizzlePg(pool, { schema });
  runMigrations = (migrationsFolder) => migratePg(db, { migrationsFolder });
  closeDb = () => pool.end();
}

export { db, runMigrations, closeDb };
export * from "./schema";
