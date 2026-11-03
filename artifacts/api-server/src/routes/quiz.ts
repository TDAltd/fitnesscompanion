import { Router } from "express";
import { sql } from "drizzle-orm";
import { db, quizEventsTable } from "@workspace/db";
import { rateLimit, requireAdmin } from "../lib/auth";

/** The sign-up quiz in order. "some" = only shown to some people, so it isn't a drop-off point. */
export const QUIZ_STEPS: { id: string; label: string; some?: boolean }[] = [
  { id: "welcome", label: "First screen" },
  { id: "goal", label: "Main goal" },
  { id: "sex", label: "Sex" },
  { id: "birthday", label: "Age" },
  { id: "health", label: "Health questions" },
  { id: "height", label: "Height" },
  { id: "weight", label: "Current weight" },
  { id: "goalWeight", label: "Goal weight", some: true },
  { id: "goalDate", label: "Goal date and pace", some: true },
  { id: "activity", label: "Daily activity" },
  { id: "workload", label: "What your week looks like" },
  { id: "experience", label: "Training experience" },
  { id: "location", label: "Where you train" },
  { id: "equipment", label: "Equipment", some: true },
  { id: "days", label: "Time for workouts" },
  { id: "time", label: "Workout time" },
  { id: "food", label: "Food preference" },
  { id: "habit", label: "Hardest to resist" },
  { id: "why", label: "Why now" },
  { id: "name", label: "Name" },
  { id: "building", label: "Building the plan" },
  { id: "preview", label: "Plan preview" },
  { id: "account", label: "Create account screen" },
  { id: "done", label: "Account created" },
];
const VALID = new Set(QUIZ_STEPS.map((s) => s.id));

export const quizEventsRouter = Router();
quizEventsRouter.post("/quiz-event", async (req, res) => {
  res.status(204).send();
  const { visitor, step } = (req.body ?? {}) as { visitor?: unknown; step?: unknown };
  if (typeof visitor !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(visitor) || typeof step !== "string" || !VALID.has(step)) return;
  if (!rateLimit(`quiz:${req.ip}`, 2000, 60 * 60 * 1000)) return;
  await db.insert(quizEventsTable).values({ visitorId: visitor, step }).onConflictDoNothing().catch(() => undefined);
});

export const adminQuizRouter = Router();
adminQuizRouter.get("/admin/quiz-funnel", requireAdmin, async (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  // People who opened the first screen in the period, and how far each got
  const rows = (
    await db.execute(sql`
      WITH starters AS (
        SELECT visitor_id FROM ${quizEventsTable}
        WHERE step = 'welcome' AND at >= now() - make_interval(days => ${days})
      )
      SELECT e.step, count(DISTINCT e.visitor_id)::int AS n
      FROM ${quizEventsTable} e JOIN starters s ON s.visitor_id = e.visitor_id
      GROUP BY e.step`)
  ).rows as { step: string; n: number }[];
  const count = new Map(rows.map((r) => [r.step, r.n]));
  const started = count.get("welcome") ?? 0;
  // "Left here": saw this screen but never reached the next screen everyone gets
  const steps = QUIZ_STEPS.map((s) => {
    const n = count.get(s.id) ?? 0;
    return { ...s, reached: n, percent: started ? Math.round((n / started) * 100) : 0, lost: null as number | null };
  });
  let last: (typeof steps)[number] | null = null;
  for (const s of steps) {
    if (s.some) continue;
    if (last) last.lost = Math.max(0, last.reached - s.reached);
    last = s;
  }
  // Clean up: nothing older than a year is needed
  void db.execute(sql`DELETE FROM ${quizEventsTable} WHERE at < now() - interval '400 days'`).catch(() => undefined);
  res.json({ days, started, finished: count.get("done") ?? 0, steps });
});
