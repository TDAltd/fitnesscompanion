import { Router } from "express";
import { randomBytes, createHash } from "node:crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { db, healthDailyTable, healthSyncTable, habitLogsTable, usersTable } from "@workspace/db";
import { rateLimit, uid } from "../lib/auth";
import { targetsForUser } from "./planSettings";
import { DEFAULT_TZ, addDays, dateInTz, todayFor } from "../lib/dates";

/**
 * Apple Health sync.
 *
 * The iPhone Shortcut can't log in with a cookie, so each user gets a private sync key.
 * The Shortcut sends today's numbers to POST /api/health-sync with
 *   Authorization: Bearer <key>
 * Shortcuts can produce numbers in different shapes (lists, "8,432", seconds vs hours),
 * so the parser below is deliberately forgiving.
 */

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

// ---------- forgiving value parsing ----------

function toNumbers(value: unknown): number[] {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value.flatMap(toNumbers);
  if (typeof value === "number") return Number.isFinite(value) ? [value] : [];
  if (typeof value === "string") {
    // "8,432", "8432 steps", "72 bpm", "1.2k" are all accepted; also newline-separated lists
    const parts = value.split(/\n/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) return parts.flatMap(toNumbers);
    const m = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    return m ? [Number(m[0])] : [];
  }
  return [];
}

const sum = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) : null);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/**
 * Sleep can arrive as seconds (Shortcuts durations), minutes or hours, or as text like
 * "7 hr 32 min" / "7:32". Returns minutes.
 */
export function parseSleepMinutes(value: unknown): number | null {
  if (typeof value === "string") {
    const hm = value.match(/(\d+)\s*(h|hr|hrs|hour|hours)\b(?:\s*(\d+)\s*(m|min|mins|minutes)\b)?/i);
    if (hm) return Number(hm[1]) * 60 + (hm[3] ? Number(hm[3]) : 0);
    const colon = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (colon) return Number(colon[1]) * 60 + Number(colon[2]);
  }
  const total = sum(toNumbers(value));
  if (total == null || total <= 0) return null;
  if (total >= 1440) return Math.round(total / 60); // seconds
  if (total > 24) return Math.round(total); // minutes
  return Math.round(total * 60); // hours
}

function inRange(n: number | null, min: number, max: number): number | null {
  return n != null && n >= min && n <= max ? Math.round(n) : null;
}

function parseDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

const fmtSleep = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

// ---------- public route (sync key, no login) ----------

export const healthSyncPublicRouter = Router();

healthSyncPublicRouter.post("/health-sync", async (req, res) => {
  const header = req.get("authorization") ?? "";
  const token = (header.match(/^Bearer\s+(.+)$/i)?.[1] ?? String(req.body?.key ?? "")).trim();
  if (!token) {
    res.status(401).json({ ok: false, message: "Missing sync key. Add the Authorization header from the Connect page." });
    return;
  }
  if (!rateLimit(`health-sync:${hashToken(token).slice(0, 16)}`, 60, 60 * 60 * 1000)) {
    res.status(429).json({ ok: false, message: "Too many syncs this hour. Try again later." });
    return;
  }

  const [link] = await db.select().from(healthSyncTable).where(eq(healthSyncTable.tokenHash, hashToken(token)));
  if (!link) {
    res.status(401).json({ ok: false, message: "This sync key isn't valid. Create a new one on the Connect Apple Health page." });
    return;
  }
  const userId = link.userId;
  const rawBody = (req.body ?? {}) as Record<string, unknown>;
  // Shortcut field names are typed by hand: accept "steps ", "Active Energy", "active_energy", "heart-rate"...
  const canonical: Record<string, string> = {
    date: "date",
    steps: "steps",
    sleep: "sleep",
    sleepminutes: "sleepMinutes",
    sleephours: "sleepHours",
    heartrate: "heartRate",
    avgheartrate: "avgHeartRate",
    activeenergy: "activeEnergy",
    activeenergykcal: "activeEnergyKcal",
    energy: "activeEnergy",
    activecalories: "activeEnergy",
    calories: "activeEnergy",
  };
  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawBody)) {
    const key = canonical[k.toLowerCase().replace(/[\s_\-]/g, "")] ?? k;
    if (body[key] === undefined || body[key] === "") body[key] = v;
  }

  // No date from the Shortcut: use "today" in the user's own timezone
  const [owner] = await db.select({ timezone: usersTable.timezone }).from(usersTable).where(eq(usersTable.id, userId));
  const date = parseDate(body.date) ?? dateInTz(new Date(), owner?.timezone ?? DEFAULT_TZ);
  const steps = inRange(sum(toNumbers(body.steps)), 0, 150_000);
  const sleepMinutes = inRange(parseSleepMinutes(body.sleep ?? body.sleepMinutes ?? body.sleepHours), 1, 1440);
  const avgHeartRate = inRange(avg(toNumbers(body.heartRate ?? body.avgHeartRate)), 25, 230);
  // If the Shortcut's unit was left on "cal" (small calories) the number is ~1000x too big; convert it
  const rawEnergy = sum(toNumbers(body.activeEnergy ?? body.activeEnergyKcal));
  const activeEnergyKcal = inRange(rawEnergy != null && rawEnergy > 10_000 ? rawEnergy / 1000 : rawEnergy, 0, 10_000);

  // Only overwrite fields the Shortcut actually sent this time
  const values = {
    ...(steps != null ? { steps } : {}),
    ...(sleepMinutes != null ? { sleepMinutes } : {}),
    ...(avgHeartRate != null ? { avgHeartRate } : {}),
    ...(activeEnergyKcal != null ? { activeEnergyKcal } : {}),
  };

  await db.transaction(async (tx) => {
    if (Object.keys(values).length > 0) {
      await tx
        .insert(healthDailyTable)
        .values({ userId, date, ...values })
        .onConflictDoUpdate({
          target: [healthDailyTable.userId, healthDailyTable.date],
          set: { ...values, updatedAt: new Date() },
        });
    }

    // Steps also fill in the daily habit checklist
    if (steps != null) {
      const targets = await targetsForUser(userId);
      await tx
        .insert(habitLogsTable)
        .values({ userId, date, stepsDone: steps, stepsGoal: targets.steps, waterGoalLitres: targets.waterLitres })
        .onConflictDoUpdate({
          target: [habitLogsTable.userId, habitLogsTable.date],
          set: { stepsDone: steps },
        });
    }

    await tx
      .update(healthSyncTable)
      .set({ lastSyncAt: new Date(), lastPayload: JSON.stringify(rawBody).slice(0, 2000) })
      .where(eq(healthSyncTable.userId, userId));
  });

  const parts = [
    steps != null ? `${steps.toLocaleString("en")} steps` : null,
    sleepMinutes != null ? `${fmtSleep(sleepMinutes)} sleep` : null,
    avgHeartRate != null ? `${avgHeartRate} bpm avg` : null,
    activeEnergyKcal != null ? `${activeEnergyKcal} kcal active` : null,
  ].filter(Boolean);

  res.json({
    ok: true,
    date,
    saved: { steps, sleepMinutes, avgHeartRate, activeEnergyKcal },
    message: parts.length ? `Synced ${date}: ${parts.join(", ")}` : `Connected, but no health numbers were found for ${date}.`,
  });
});

// ---------- logged-in routes ----------

export const healthRouter = Router();

healthRouter.get("/health-sync/status", async (req, res) => {
  const [link] = await db.select().from(healthSyncTable).where(eq(healthSyncTable.userId, uid(req)));
  res.json({
    connected: Boolean(link),
    createdAt: link?.createdAt?.toISOString() ?? null,
    lastSyncAt: link?.lastSyncAt?.toISOString() ?? null,
    lastPayload: link?.lastPayload ?? null,
  });
});

/** Creates (or replaces) the user's sync key. The raw key is only ever shown once. */
healthRouter.post("/health-sync/key", async (req, res) => {
  const userId = uid(req);
  const token = `fh_${randomBytes(24).toString("base64url")}`;
  await db
    .insert(healthSyncTable)
    .values({ userId, tokenHash: hashToken(token) })
    .onConflictDoUpdate({
      target: healthSyncTable.userId,
      set: { tokenHash: hashToken(token), createdAt: new Date(), lastSyncAt: null, lastPayload: null },
    });
  res.status(201).json({ key: token });
});

healthRouter.delete("/health-sync/key", async (req, res) => {
  await db.delete(healthSyncTable).where(eq(healthSyncTable.userId, uid(req)));
  res.status(204).send();
});

healthRouter.get("/health", async (req, res) => {
  const days = Math.min(366, Math.max(1, Number(req.query.days) || 14));
  const since = addDays(todayFor(req), -days);
  const rows = await db
    .select()
    .from(healthDailyTable)
    .where(and(eq(healthDailyTable.userId, uid(req)), gte(healthDailyTable.date, since)))
    .orderBy(desc(healthDailyTable.date));
  res.json(
    rows.map((r) => ({
      date: r.date,
      steps: r.steps,
      sleepMinutes: r.sleepMinutes,
      avgHeartRate: r.avgHeartRate,
      activeEnergyKcal: r.activeEnergyKcal,
      updatedAt: r.updatedAt.toISOString(),
    })),
  );
});
