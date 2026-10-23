import { Router } from "express";
import { uid } from "../lib/auth";
import { db, weightLogsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { CreateWeightLogBody, DeleteWeightLogParams } from "@workspace/api-zod";

const router = Router();

router.get("/weight", async (req, res) => {
  const logs = await db
    .select()
    .from(weightLogsTable)
    .where(eq(weightLogsTable.userId, uid(req)))
    .orderBy(desc(weightLogsTable.loggedAt));

  const formatted = logs.map((l) => ({
    id: l.id,
    weightKg: l.weightKg,
    notes: l.notes,
    loggedAt: l.loggedAt.toISOString(),
  }));
  res.json(formatted);
});

router.post("/weight", async (req, res) => {
  const body = CreateWeightLogBody.parse(req.body);
  const [inserted] = await db
    .insert(weightLogsTable)
    .values({
      userId: uid(req),
      weightKg: body.weightKg,
      notes: body.notes,
      loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
    })
    .returning();

  res.status(201).json({
    id: inserted.id,
    weightKg: inserted.weightKg,
    notes: inserted.notes,
    loggedAt: inserted.loggedAt.toISOString(),
  });
});

router.delete("/weight/:id", async (req, res) => {
  const { id } = DeleteWeightLogParams.parse({ id: Number(req.params.id) });
  await db.delete(weightLogsTable).where(and(eq(weightLogsTable.id, id), eq(weightLogsTable.userId, uid(req))));
  res.status(204).send();
});

export default router;
