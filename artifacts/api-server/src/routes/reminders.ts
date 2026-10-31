import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { db, habitLogsTable, pushSubscriptionsTable, reminderSettingsTable, userProfileTable } from "@workspace/db";
import { uid } from "../lib/auth";
import { todayFor } from "../lib/dates";
import { sendToUser, vapidKeys } from "../lib/push";
import { runReminders, settingsFor, validTime, workoutTimeFor } from "../lib/reminders";
import { targetsForUser } from "./planSettings";


/**
 * Cron, run every 15 minutes from cPanel:
 *   curl -s "https://tdaproducthub.com/fitnesscompanion/api/cron/reminders?key=YOUR_CRON_SECRET" > /dev/null
 */
export const remindersCronRouter = Router();

function secretOk(given: unknown): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || typeof given !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

const runCron = async (req: import("express").Request, res: import("express").Response) => {
  if (!secretOk(req.query.key ?? req.get("x-cron-key"))) {
    res.status(403).json({ error: "Wrong or missing key" });
    return;
  }
  res.json(await runReminders());
};
remindersCronRouter.get("/cron/reminders", runCron);
remindersCronRouter.post("/cron/reminders", runCron);

const router = Router();

router.get("/push/public-key", async (_req, res) => {
  res.json({ key: (await vapidKeys()).publicKey });
});

router.post("/push/subscribe", async (req, res) => {
  const body = (req.body ?? {}) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown }; device?: unknown };
  const endpoint = typeof body.endpoint === "string" && /^https:\/\//.test(body.endpoint) && body.endpoint.length < 2000 ? body.endpoint : null;
  const p256dh = typeof body.keys?.p256dh === "string" && body.keys.p256dh.length < 300 ? body.keys.p256dh : null;
  const auth = typeof body.keys?.auth === "string" && body.keys.auth.length < 100 ? body.keys.auth : null;
  if (!endpoint || !p256dh || !auth) {
    res.status(400).json({ error: "That notification subscription looks incomplete." });
    return;
  }
  const device = typeof body.device === "string" ? body.device.slice(0, 40) : null;
  await db
    .insert(pushSubscriptionsTable)
    .values({ userId: uid(req), endpoint, p256dh, auth, device })
    // Same phone, maybe a different account now: it belongs to whoever subscribed last
    .onConflictDoUpdate({ target: pushSubscriptionsTable.endpoint, set: { userId: uid(req), p256dh, auth, device } });
  res.status(201).json({ ok: true });
});

router.post("/push/unsubscribe", async (req, res) => {
  const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";
  await db.delete(pushSubscriptionsTable).where(and(eq(pushSubscriptionsTable.userId, uid(req)), eq(pushSubscriptionsTable.endpoint, endpoint)));
  res.status(204).send();
});

router.post("/push/test", async (req, res) => {
  const result = await sendToUser(uid(req), {
    title: "Notifications are on",
    body: "This is how your water, workout, meal and weigh-in reminders will look.",
    url: "/reminders",
    tag: "test",
  });
  if (!result.sent) {
    res.status(409).json({ error: "No device is set up to receive notifications yet. Tap Turn on first.", ...result });
    return;
  }
  res.json(result);
});

async function settingsResponse(userId: number) {
  const s = await settingsFor(userId);
  const [profile] = await db.select({ pref: userProfileTable.workoutTimePreference }).from(userProfileTable).where(eq(userProfileTable.userId, userId));
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, userId));
  return { ...s, workoutTime: workoutTimeFor(s, profile?.pref), devices: n };
}

router.get("/reminders/settings", async (req, res) => {
  res.json(await settingsResponse(uid(req)));
});

router.put("/reminders/settings", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const current = await settingsFor(uid(req));
  const next = { ...current };
  for (const k of ["water", "workout", "meals", "weighIn"] as const) if (typeof body[k] === "boolean") next[k] = body[k] as boolean;
  for (const k of ["wakeTime", "bedTime", "workoutTime"] as const) {
    if (!(k in body)) continue;
    if (!validTime(body[k])) {
      res.status(400).json({ error: "Times look like 07:00." });
      return;
    }
    next[k] = body[k] as string;
  }
  if ("weighInDay" in body) {
    const d = Number(body.weighInDay);
    if (!Number.isInteger(d) || d < 0 || d > 6) {
      res.status(400).json({ error: "Pick a day of the week." });
      return;
    }
    next.weighInDay = d;
  }
  if (next.bedTime <= next.wakeTime) {
    res.status(400).json({ error: "Bedtime needs to be later than wake-up time." });
    return;
  }
  await db
    .insert(reminderSettingsTable)
    .values({ userId: uid(req), ...next })
    .onConflictDoUpdate({ target: reminderSettingsTable.userId, set: { ...next, updatedAt: new Date() } });
  res.json(await settingsResponse(uid(req)));
});

/** "I drank a glass" straight from the notification: +0.5 L today. */
router.post("/reminders/water-glass", async (req, res) => {
  const userId = uid(req);
  const date = todayFor(req);
  const targets = await targetsForUser(userId);
  const [row] = await db
    .insert(habitLogsTable)
    .values({ userId, date, stepsGoal: targets.steps, waterGoalLitres: targets.waterLitres, waterDoneLitres: 0.5 })
    .onConflictDoUpdate({ target: [habitLogsTable.userId, habitLogsTable.date], set: { waterDoneLitres: sql`${habitLogsTable.waterDoneLitres} + 0.5` } })
    .returning();
  res.json({ date, waterDoneLitres: row.waterDoneLitres, waterGoalLitres: row.waterGoalLitres });
});

export default router;
