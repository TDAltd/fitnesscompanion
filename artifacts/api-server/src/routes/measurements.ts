import { Router } from "express";
import { uid } from "../lib/auth";
import { db, bodyMeasurementsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { AddMeasurementBody, DeleteMeasurementParams } from "@workspace/api-zod";
import { desc } from "drizzle-orm";

const router = Router();

const toResponse = (m: typeof bodyMeasurementsTable.$inferSelect) => ({
  id: m.id,
  date: m.date,
  neckCm: m.neckCm,
  chestCm: m.chestCm,
  waistCm: m.waistCm,
  hipsCm: m.hipsCm,
  leftArmCm: m.leftArmCm,
  rightArmCm: m.rightArmCm,
  leftThighCm: m.leftThighCm,
  rightThighCm: m.rightThighCm,
  notes: m.notes,
  createdAt: m.createdAt.toISOString(),
});

router.get("/measurements", async (req, res) => {
  const rows = await db
    .select()
    .from(bodyMeasurementsTable)
    .where(eq(bodyMeasurementsTable.userId, uid(req)))
    .orderBy(desc(bodyMeasurementsTable.date));
  res.json(rows.map(toResponse));
});

router.post("/measurements", async (req, res) => {
  const body = AddMeasurementBody.parse(req.body);
  const [inserted] = await db
    .insert(bodyMeasurementsTable)
    .values({
      userId: uid(req),
      date: body.date,
      neckCm: body.neckCm ?? null,
      chestCm: body.chestCm ?? null,
      waistCm: body.waistCm ?? null,
      hipsCm: body.hipsCm ?? null,
      leftArmCm: body.leftArmCm ?? null,
      rightArmCm: body.rightArmCm ?? null,
      leftThighCm: body.leftThighCm ?? null,
      rightThighCm: body.rightThighCm ?? null,
      notes: body.notes ?? null,
    })
    .returning();
  res.status(201).json(toResponse(inserted));
});

router.delete("/measurements/:id", async (req, res) => {
  const { id } = DeleteMeasurementParams.parse({ id: Number(req.params.id) });
  await db.delete(bodyMeasurementsTable).where(and(eq(bodyMeasurementsTable.id, id), eq(bodyMeasurementsTable.userId, uid(req))));
  res.status(204).send();
});

export default router;
