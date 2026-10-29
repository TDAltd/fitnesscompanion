import { Router } from "express";
import { uid } from "../lib/auth";
import { db, exerciseSetsTable, workoutLogsTable } from "@workspace/db";
import { tzFor, dateInTz } from "../lib/dates";
import { and, asc, desc, eq } from "drizzle-orm";
import { CreateWorkoutBody, DeleteWorkoutParams } from "@workspace/api-zod";

const router = Router();

router.get("/workouts", async (req, res) => {
  const logs = await db
    .select()
    .from(workoutLogsTable)
    .where(eq(workoutLogsTable.userId, uid(req)))
    .orderBy(desc(workoutLogsTable.loggedAt));

  const formatted = logs.map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type,
    durationMins: l.durationMins,
    notes: l.notes,
    loggedAt: l.loggedAt.toISOString(),
  }));
  res.json(formatted);
});

router.post("/workouts", async (req, res) => {
  const body = CreateWorkoutBody.parse(req.body);
  const [inserted] = await db
    .insert(workoutLogsTable)
    .values({
      userId: uid(req),
      name: body.name,
      type: body.type,
      durationMins: body.durationMins,
      notes: body.notes,
      loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
    })
    .returning();

  res.status(201).json({
    id: inserted.id,
    name: inserted.name,
    type: inserted.type,
    durationMins: inserted.durationMins,
    notes: inserted.notes,
    loggedAt: inserted.loggedAt.toISOString(),
  });
});

router.delete("/workouts/:id", async (req, res) => {
  const { id } = DeleteWorkoutParams.parse({ id: Number(req.params.id) });
  await db.delete(workoutLogsTable).where(and(eq(workoutLogsTable.id, id), eq(workoutLogsTable.userId, uid(req))));
  res.status(204).send();
});

const WORKOUT_TYPES = ["Strength", "Cardio", "Flexibility", "Active Recovery", "Other"];

async function ownWorkout(userId: number, id: number) {
  const [w] = await db.select().from(workoutLogsTable).where(and(eq(workoutLogsTable.id, id), eq(workoutLogsTable.userId, userId)));
  return w;
}

/** One session with its sets, for the edit screen. */
router.get("/workouts/:id/detail", async (req, res) => {
  const w = await ownWorkout(uid(req), Number(req.params.id));
  if (!w) return void res.status(404).json({ error: "That session isn't in your log any more." });
  const sets = await db
    .select({ exercise: exerciseSetsTable.exercise, setNumber: exerciseSetsTable.setNumber, weightKg: exerciseSetsTable.weightKg, reps: exerciseSetsTable.reps })
    .from(exerciseSetsTable)
    .where(and(eq(exerciseSetsTable.workoutId, w.id), eq(exerciseSetsTable.userId, w.userId)))
    .orderBy(asc(exerciseSetsTable.id));
  res.json({
    id: w.id,
    name: w.name,
    type: w.type,
    durationMins: w.durationMins,
    notes: w.notes,
    loggedAt: w.loggedAt.toISOString(),
    date: dateInTz(w.loggedAt, tzFor(req)),
    sets,
  });
});

/**
 * Fix a session: name, type, minutes, day, and (optionally) its sets, which are replaced as a whole.
 * Body: { name?, type?, durationMins?, date?: "YYYY-MM-DD", sets?: [{ exercise, setNumber, weightKg|null, reps }] }
 */
router.patch("/workouts/:id", async (req, res) => {
  const userId = uid(req);
  const w = await ownWorkout(userId, Number(req.params.id));
  if (!w) return void res.status(404).json({ error: "That session isn't in your log any more." });
  const b = (req.body ?? {}) as Record<string, unknown>;
  const updates: Partial<typeof workoutLogsTable.$inferInsert> = {};

  if (b.name !== undefined) {
    const name = typeof b.name === "string" ? b.name.trim().slice(0, 120) : "";
    if (!name) return void res.status(400).json({ error: "Give the session a name." });
    updates.name = name;
  }
  if (b.type !== undefined) {
    if (typeof b.type !== "string" || !WORKOUT_TYPES.includes(b.type)) return void res.status(400).json({ error: "Choose a workout type." });
    updates.type = b.type;
  }
  if (b.durationMins !== undefined) {
    const n = b.durationMins === null || b.durationMins === "" ? null : Number(b.durationMins);
    if (n !== null && (!Number.isFinite(n) || n < 1 || n > 600)) return void res.status(400).json({ error: "Minutes must be between 1 and 600." });
    updates.durationMins = n === null ? null : Math.round(n);
  }
  let date: string | undefined;
  if (b.date !== undefined) {
    if (typeof b.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return void res.status(400).json({ error: "Choose a day." });
    const today = dateInTz(new Date(), tzFor(req));
    if (b.date > today) return void res.status(400).json({ error: "Choose a day that isn't in the future." });
    date = b.date;
    // Midday UTC on that day, so it stays on the same calendar day in any timezone near Africa/Europe
    updates.loggedAt = new Date(`${b.date}T12:00:00Z`);
  }

  let sets: { exercise: string; setNumber: number; weightKg: number | null; reps: number }[] | undefined;
  if (b.sets !== undefined) {
    if (!Array.isArray(b.sets) || b.sets.length > 200) return void res.status(400).json({ error: "Too many sets." });
    sets = b.sets.map((raw) => {
      const s = raw as Record<string, unknown>;
      return {
        exercise: typeof s.exercise === "string" ? s.exercise.trim().slice(0, 120) : "",
        setNumber: Number(s.setNumber),
        weightKg: s.weightKg === null || s.weightKg === "" || s.weightKg === undefined ? null : Number(s.weightKg),
        reps: Number(s.reps),
      };
    });
    const bad = sets.some(
      (s) =>
        !s.exercise ||
        !Number.isInteger(s.setNumber) || s.setNumber < 1 || s.setNumber > 20 ||
        !Number.isInteger(s.reps) || s.reps < 1 || s.reps > 500 ||
        (s.weightKg !== null && (!Number.isFinite(s.weightKg) || s.weightKg < 0 || s.weightKg > 1000)),
    );
    if (bad) return void res.status(400).json({ error: "Each set needs reps above 0 and a sensible weight." });
    updates.notes = sets.length ? `${sets.length} sets logged` : w.notes?.includes("sets logged") ? null : w.notes;
  }

  const setDate = date ?? dateInTz(w.loggedAt, tzFor(req));
  const updated = await db.transaction(async (tx) => {
    const [row] = Object.keys(updates).length
      ? await tx.update(workoutLogsTable).set(updates).where(eq(workoutLogsTable.id, w.id)).returning()
      : [w];
    if (sets) {
      await tx.delete(exerciseSetsTable).where(and(eq(exerciseSetsTable.workoutId, w.id), eq(exerciseSetsTable.userId, userId)));
      if (sets.length) await tx.insert(exerciseSetsTable).values(sets.map((s) => ({ ...s, userId, workoutId: w.id, date: setDate })));
    } else if (date) {
      await tx.update(exerciseSetsTable).set({ date }).where(and(eq(exerciseSetsTable.workoutId, w.id), eq(exerciseSetsTable.userId, userId)));
    }
    return row;
  });
  res.json({ id: updated.id, name: updated.name, type: updated.type, durationMins: updated.durationMins, notes: updated.notes, loggedAt: updated.loggedAt.toISOString() });
});

export default router;
