import { Router, type Request, type Response } from "express";
import { and, asc, between, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import {
  db,
  usersTable,
  workoutLogsTable,
  weightLogsTable,
  mealPlanTable,
  healthDailyTable,
  habitLogsTable,
  usageEventsTable,
  userProfileTable,
} from "@workspace/db";
import { calorieFloor } from "@workspace/plan";
import { targetsForUser } from "./planSettings";
import { TREAT_KCAL } from "./foodLog";
import { addDays, dateInTz, DEFAULT_TZ, validTimezone } from "../lib/dates";
import { appUrl, checkUnsubscribe, emailHtml, mailConfigured, sendMail, unsubscribeToken } from "../lib/mail";
import { envAdmins } from "../lib/auth";
import { logger } from "../lib/logger";

/**
 * Weekly summary email. Run from a cPanel cron job once a week, e.g. Sunday 18:00:
 *   curl -s "https://tdaproducthub.com/fitnesscompanion/api/cron/weekly-summary?key=YOUR_CRON_SECRET"
 * Each person gets at most one email per 6 days, so running it twice by mistake is harmless.
 */
const router = Router();

function secretOk(given: unknown): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || typeof given !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Summary = { rows: [string, string][]; lines: string[] };

async function summarise(user: typeof usersTable.$inferSelect): Promise<Summary | null> {
  const tz = validTimezone(user.timezone) ? user.timezone : DEFAULT_TZ;
  const to = dateInTz(new Date(), tz);
  const from = addDays(to, -6);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [profile] = await db.select().from(userProfileTable).where(eq(userProfileTable.userId, user.id));
  if (!profile) return null; // never finished setting up
  const targets = await targetsForUser(user.id);

  const [workouts] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(workoutLogsTable)
    .where(and(eq(workoutLogsTable.userId, user.id), gte(workoutLogsTable.loggedAt, since)));
  const plannedSessions = profile.workoutDaysPerWeek ?? 3;

  const food = await db
    .select({ date: mealPlanTable.date, kcal: sql<number>`sum(${mealPlanTable.calories})::int` })
    .from(mealPlanTable)
    .where(and(eq(mealPlanTable.userId, user.id), between(mealPlanTable.date, from, to)))
    .groupBy(mealPlanTable.date);
  // Same rule as the app: on target means 80–100% of the target (+50 kcal). Very low days are not wins.
  const treats = new Set(
    (await db
      .select({ date: habitLogsTable.date })
      .from(habitLogsTable)
      .where(and(eq(habitLogsTable.userId, user.id), eq(habitLogsTable.treatMeal, true), between(habitLogsTable.date, from, to)))).map((r) => r.date),
  );
  const targetOn = (date: string) => targets.calories + (treats.has(date) ? TREAT_KCAL : 0);
  const onTarget = food.filter((d) => d.kcal >= targetOn(d.date) * 0.8 && d.kcal <= targetOn(d.date) + 50).length;
  const floor = calorieFloor(profile.sex);
  const lowDays = food.filter((d) => d.kcal < floor).length;

  const steps = await db
    .select({ steps: healthDailyTable.steps })
    .from(healthDailyTable)
    .where(and(eq(healthDailyTable.userId, user.id), between(healthDailyTable.date, from, to)));
  let stepValues = steps.map((s) => s.steps ?? 0).filter((n) => n > 0);
  if (!stepValues.length) {
    const habits = await db
      .select({ steps: habitLogsTable.stepsDone })
      .from(habitLogsTable)
      .where(and(eq(habitLogsTable.userId, user.id), between(habitLogsTable.date, from, to)));
    stepValues = habits.map((h) => h.steps).filter((n) => n > 0);
  }
  const avgSteps = stepValues.length ? Math.round(stepValues.reduce((a, b) => a + b, 0) / stepValues.length) : null;

  const [latest] = await db.select().from(weightLogsTable).where(eq(weightLogsTable.userId, user.id)).orderBy(desc(weightLogsTable.loggedAt)).limit(1);
  const [weekAgo] = await db
    .select()
    .from(weightLogsTable)
    .where(and(eq(weightLogsTable.userId, user.id), sql`${weightLogsTable.loggedAt} <= ${since}`))
    .orderBy(desc(weightLogsTable.loggedAt))
    .limit(1);
  const [first] = latest && !weekAgo
    ? await db.select().from(weightLogsTable).where(eq(weightLogsTable.userId, user.id)).orderBy(asc(weightLogsTable.loggedAt)).limit(1)
    : [];

  const nothing = workouts.n === 0 && food.length === 0 && !avgSteps && !(latest && latest.loggedAt >= since);
  const rows: [string, string][] = [
    ["Workouts", `${workouts.n} of ${plannedSessions} planned`],
    ["Days food logged", `${food.length} of 7${food.length ? ` (${onTarget} within target)` : ""}`],
  ];
  if (avgSteps) rows.push(["Average steps", `${avgSteps.toLocaleString("en-GB")} a day (goal ${targets.steps.toLocaleString("en-GB")})`]);
  const base = weekAgo ?? first;
  if (latest && base && base.id !== latest.id) {
    const diff = Math.round((latest.weightKg - base.weightKg) * 10) / 10;
    rows.push(["Weight change", `${diff > 0 ? "+" : ""}${diff} kg (now ${latest.weightKg} kg)`]);
  } else if (latest) {
    rows.push(["Latest weight", `${latest.weightKg} kg`]);
  }

  const lines: string[] = [];
  if (nothing) {
    lines.push("Nothing was logged this week, and that's okay. A fresh week starts tomorrow: one workout and one logged meal is a great start.");
  } else {
    if (workouts.n >= plannedSessions) lines.push("You hit every planned workout. That consistency is what changes things.");
    else if (workouts.n > 0) lines.push(`${workouts.n} workout${workouts.n === 1 ? "" : "s"} done. Next week, aim for ${Math.min(plannedSessions, workouts.n + 1)}.`);
    if (food.length >= 5) lines.push("Great food logging this week. The more you log, the more accurate your plan gets.");
    else lines.push("Try logging food on a few more days next week. Even rough entries help.");
    if (lowDays > 0)
      lines.push(`${lowDays} day${lowDays === 1 ? " looks" : "s look"} very low (under ${floor.toLocaleString("en-GB")} kcal). If you forgot to log some meals, add them. If you really ate that little, it's too little to lose weight safely.`);
  }
  return { rows, lines };
}

async function run(req: Request, res: Response) {
  if (!process.env.CRON_SECRET) {
    res.status(503).json({ error: "Set CRON_SECRET in the app's environment variables first." });
    return;
  }
  if (!secretOk(req.query.key ?? req.get("x-cron-key"))) {
    res.status(401).json({ error: "Wrong key." });
    return;
  }
  if (!mailConfigured()) {
    res.status(503).json({ error: "Email isn't set up (SMTP_HOST, SMTP_USER, SMTP_PASS)." });
    return;
  }
  const base = appUrl(req);
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  const users = await db.select().from(usersTable).where(and(eq(usersTable.weeklyEmail, true), isNull(usersTable.disabledAt), eq(usersTable.role, "user")));
  const admins = new Set(envAdmins());
  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    if (admins.has(user.email)) continue;
    const [recent] = await db
      .select({ id: usageEventsTable.id })
      .from(usageEventsTable)
      .where(and(eq(usageEventsTable.userId, user.id), eq(usageEventsTable.kind, "weekly_email"), gte(usageEventsTable.createdAt, sixDaysAgo)))
      .limit(1);
    if (recent) {
      skipped++;
      continue;
    }
    try {
      const summary = await summarise(user);
      if (!summary) {
        skipped++;
        continue;
      }
      const unsub = `${base}/api/email/unsubscribe?u=${user.id}&t=${unsubscribeToken(user.id)}`;
      const text = [
        "Your week with Fitness Companion",
        "",
        ...summary.rows.map(([k, v]) => `${k}: ${v}`),
        "",
        ...summary.lines,
        "",
        `Open the app: ${base}/`,
        "",
        `Stop these emails: ${unsub}`,
      ].join("\n");
      const ok = await sendMail(
        user.email,
        "Your week in Fitness Companion",
        text,
        emailHtml({
          heading: "Your week",
          paragraphs: [],
          rows: summary.rows,
          button: { label: "Open Fitness Companion", url: `${base}/` },
          footer: `${summary.lines.map((l) => l.replace(/[&<>]/g, "")).join(" ")}<br><br>You get this every week because you have a Fitness Companion account. <a href="${unsub}" style="color:#2E7D6B">Stop weekly emails</a>.`,
        }),
      );
      if (ok) {
        sent++;
        await db.insert(usageEventsTable).values({ userId: user.id, kind: "weekly_email" });
      }
    } catch (err) {
      logger.error({ err, user: user.id }, "weekly summary failed");
    }
  }
  res.json({ sent, skipped, considered: users.length });
}

router.get("/cron/weekly-summary", run);
router.post("/cron/weekly-summary", run);

/** One-click unsubscribe from the link in the email (no login needed). */
router.get("/email/unsubscribe", async (req, res) => {
  const id = Number(req.query.u);
  const token = typeof req.query.t === "string" ? req.query.t : "";
  const ok = Number.isInteger(id) && checkUnsubscribe(id, token);
  if (ok) await db.update(usersTable).set({ weeklyEmail: false }).where(eq(usersTable.id, id));
  res
    .status(ok ? 200 : 400)
    .type("html")
    .send(
      emailHtml({
        heading: ok ? "You're unsubscribed" : "That link didn't work",
        paragraphs: [
          ok
            ? "You won't get weekly summary emails any more. You can turn them back on in the app under Me → Account."
            : "Turn weekly emails off in the app instead: Me → Account.",
        ],
        button: { label: "Open Fitness Companion", url: `${appUrl(req)}/` },
      }),
    );
});

export default router;
