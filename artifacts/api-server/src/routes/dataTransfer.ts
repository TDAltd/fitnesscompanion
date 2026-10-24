import { Router } from "express";
import { eq, getTableColumns, type InferInsertModel } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import {
  db,
  userProfileTable,
  weightLogsTable,
  workoutLogsTable,
  habitLogsTable,
  mealPlanTable,
  bodyMeasurementsTable,
  healthDailyTable,
} from "@workspace/db";
import { uid } from "../lib/auth";

/**
 * Import / export of a user's data as JSON.
 * The format uses the database column names (snake_case), so the same file works for:
 *   - the one-off export from the old Replit database (see README), and
 *   - backups downloaded from this app (GET /api/export).
 */
const router = Router();

const TABLES = {
  user_profile: userProfileTable,
  weight_logs: weightLogsTable,
  workout_logs: workoutLogsTable,
  habit_logs: habitLogsTable,
  meal_plan_entries: mealPlanTable,
  body_measurements: bodyMeasurementsTable,
  health_daily: healthDailyTable,
} as const;

type TableKey = keyof typeof TABLES;
const SKIP = new Set(["id", "user_id"]);
const MAX_ROWS_PER_TABLE = 20_000;

function rowToDb(table: PgTable, raw: Record<string, unknown>, userId: number) {
  const out: Record<string, unknown> = { userId };
  for (const [key, col] of Object.entries(getTableColumns(table))) {
    if (SKIP.has(col.name)) continue;
    // accept snake_case (DB export) or camelCase
    const value = raw[col.name] ?? raw[key];
    if (value === undefined) continue;
    if (value !== null && col.columnType === "PgTimestamp") {
      const d = new Date(value as string);
      if (Number.isNaN(d.getTime())) throw new Error(`Bad date "${String(value)}" in ${col.name}`);
      out[key] = d;
    } else {
      out[key] = value;
    }
  }
  return out;
}

function rowFromDb(table: PgTable, row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(getTableColumns(table))) {
    if (SKIP.has(col.name)) continue;
    const v = row[key];
    out[col.name] = v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

router.get("/export", async (req, res) => {
  const userId = uid(req);
  const data: Record<string, unknown[]> = {};
  for (const [name, table] of Object.entries(TABLES)) {
    const rows = await db
      .select()
      .from(table as typeof weightLogsTable)
      .where(eq((table as typeof weightLogsTable).userId, userId));
    data[name] = rows.map((r) => rowFromDb(table, r as Record<string, unknown>));
  }
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Disposition", `attachment; filename="fitness-backup-${stamp}.json"`);
  res.json({ format: "fitness-app-export", version: 1, exportedAt: new Date().toISOString(), data });
});

/**
 * Replaces ALL of the current user's data with the contents of the file.
 * Accepts { data: { table: rows[] } } or the bare { table: rows[] } object.
 */
router.post("/import", async (req, res) => {
  const userId = uid(req);
  const body = (req.body ?? {}) as Record<string, unknown>;
  const payload = (typeof body.data === "object" && body.data !== null ? body.data : body) as Record<
    string,
    unknown
  >;

  const found = (Object.keys(TABLES) as TableKey[]).filter((k) => Array.isArray(payload[k]));
  if (found.length === 0) {
    res.status(400).json({
      error: "This file doesn't look like a fitness data export. Expected tables like weight_logs or habit_logs.",
    });
    return;
  }

  let prepared: Partial<Record<TableKey, Record<string, unknown>[]>>;
  try {
    prepared = {};
    for (const key of found) {
      const rows = payload[key] as Record<string, unknown>[];
      if (rows.length > MAX_ROWS_PER_TABLE) throw new Error(`Too many rows in ${key}`);
      let mapped = rows.map((r) => rowToDb(TABLES[key], r, userId));
      // Only one profile per user; keep the most recently updated one
      if (key === "user_profile" && mapped.length > 1) {
        mapped.sort((a, b) => +(b.updatedAt as Date ?? 0) - +(a.updatedAt as Date ?? 0));
        mapped = mapped.slice(0, 1);
      }
      // One habit row per day; last one wins
      if (key === "habit_logs" || key === "health_daily") {
        const byDate = new Map<unknown, Record<string, unknown>>();
        for (const r of mapped) byDate.set(r.date, r);
        mapped = [...byDate.values()];
      }
      prepared[key] = mapped;
    }
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid file" });
    return;
  }

  const counts: Record<string, number> = {};
  try {
    await db.transaction(async (tx) => {
      for (const key of found) {
        const table = TABLES[key] as typeof weightLogsTable;
        await tx.delete(table).where(eq(table.userId, userId));
        const rows = prepared[key] ?? [];
        for (let i = 0; i < rows.length; i += 500) {
          await tx.insert(table).values(rows.slice(i, i + 500) as InferInsertModel<typeof table>[]);
        }
        counts[key] = rows.length;
      }
    });
  } catch (err) {
    req.log.error({ err }, "import failed");
    res.status(400).json({
      error: "Import failed: some rows had missing or invalid values. Nothing was changed.",
    });
    return;
  }

  res.json({ imported: counts });
});

export default router;
