import { Router } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, exerciseSetsTable, workoutLogsTable } from "@workspace/db";
import { uid } from "../lib/auth";
import { todayFor } from "../lib/dates";

/**
 * Per-exercise logging for the Train page: weight x reps for each set, so the app can show
 * last time's numbers and suggest when to go heavier.
 */
const router = Router();

type SetRow = { setNumber: number; weightKg: number | null; reps: number };

/** The most recent session's sets for each exercise name. GET /exercise-sets/last?names=Squat|Push-up */
router.get("/exercise-sets/last", async (req, res) => {
  const names = String(req.query.names ?? "")
    .split("|")
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 30);
  if (!names.length) return void res.json({});
  const userId = uid(req);

  // Latest date per exercise, then that day's sets
  const latest = await db
    .select({ exercise: exerciseSetsTable.exercise, date: sql<string>`max(${exerciseSetsTable.date})` })
    .from(exerciseSetsTable)
    .where(and(eq(exerciseSetsTable.userId, userId), inArray(exerciseSetsTable.exercise, names)))
    .groupBy(exerciseSetsTable.exercise);

  const out: Record<string, { date: string; sets: SetRow[] }> = {};
  for (const { exercise, date } of latest) {
    const sets = await db
      .select({ setNumber: exerciseSetsTable.setNumber, weightKg: exerciseSetsTable.weightKg, reps: exerciseSetsTable.reps })
      .from(exerciseSetsTable)
      .where(and(eq(exerciseSetsTable.userId, userId), eq(exerciseSetsTable.exercise, exercise), eq(exerciseSetsTable.date, date)))
      .orderBy(exerciseSetsTable.setNumber);
    out[exercise] = { date, sets };
  }
  res.json(out);
});

/** History for one exercise (last 12 sessions, best set each). */
router.get("/exercise-sets/history", async (req, res) => {
  const name = String(req.query.name ?? "").trim();
  if (!name) return void res.json([]);
  const rows = await db
    .select({
      date: exerciseSetsTable.date,
      topWeight: sql<number | null>`max(${exerciseSetsTable.weightKg})`,
      totalReps: sql<number>`sum(${exerciseSetsTable.reps})::int`,
      sets: sql<number>`count(*)::int`,
    })
    .from(exerciseSetsTable)
    .where(and(eq(exerciseSetsTable.userId, uid(req)), eq(exerciseSetsTable.exercise, name)))
    .groupBy(exerciseSetsTable.date)
    .orderBy(desc(exerciseSetsTable.date))
    .limit(12);
  res.json(rows.reverse());
});

/**
 * Save a finished session: every set, plus one workout log entry so it counts on Today and Progress.
 * Body: { title, type?, durationMins?, sets: [{ exercise, setNumber, weightKg|null, reps }] }
 */
router.post("/exercise-sets/session", async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim().slice(0, 120) : "";
  const rawSets = Array.isArray(b.sets) ? b.sets : [];
  const sets = rawSets
    .map((s) => s as Record<string, unknown>)
    .map((s) => ({
      exercise: typeof s.exercise === "string" ? s.exercise.trim().slice(0, 120) : "",
      setNumber: Number(s.setNumber),
      weightKg: s.weightKg === null || s.weightKg === "" || s.weightKg === undefined ? null : Number(s.weightKg),
      reps: Number(s.reps),
    }))
    .filter(
      (s) =>
        s.exercise &&
        Number.isInteger(s.setNumber) && s.setNumber >= 1 && s.setNumber <= 20 &&
        Number.isInteger(s.reps) && s.reps >= 1 && s.reps <= 500 &&
        (s.weightKg === null || (Number.isFinite(s.weightKg) && s.weightKg >= 0 && s.weightKg <= 1000)),
    );
  if (!title) return void res.status(400).json({ error: "Session needs a title." });
  // A session with only timed/cardio moves has no sets; it still counts as a workout
  if (!sets.length && rawSets.length) return void res.status(400).json({ error: "Each set needs reps above 0." });
  if (sets.length > 200) return void res.status(400).json({ error: "Too many sets." });

  const durationMins = Number(b.durationMins);
  const userId = uid(req);
  const date = todayFor(req);
  const type = typeof b.type === "string" && ["Strength", "Cardio", "Flexibility", "Active Recovery", "Other"].includes(b.type) ? b.type : "Strength";

  await db.transaction(async (tx) => {
    const [workout] = await tx.insert(workoutLogsTable).values({
      userId,
      name: title,
      type,
      durationMins: Number.isFinite(durationMins) && durationMins > 0 && durationMins <= 600 ? Math.round(durationMins) : null,
      notes: sets.length ? `${sets.length} sets logged` : null,
    }).returning();
    if (sets.length) await tx.insert(exerciseSetsTable).values(sets.map((s) => ({ ...s, userId, date, workoutId: workout.id })));
  });
  res.status(201).json({ saved: sets.length, date });
});

export default router;
