import { Router } from "express";
import { uid } from "../lib/auth";
import { db, workoutLogsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
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

export default router;
