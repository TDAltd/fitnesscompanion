import { Router } from "express";
import { uid } from "../lib/auth";
import { db, mealPlanTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { AddMealPlanBody, RemoveMealPlanParams } from "@workspace/api-zod";

const router = Router();

router.get("/meal-plan", async (req, res) => {
  const date =
    typeof req.query.date === "string"
      ? req.query.date
      : new Date().toISOString().slice(0, 10);

  const entries = await db
    .select()
    .from(mealPlanTable)
    .where(and(eq(mealPlanTable.date, date), eq(mealPlanTable.userId, uid(req))));

  res.json(
    entries.map((e) => ({
      id: e.id,
      date: e.date,
      mealName: e.mealName,
      category: e.category,
      calories: e.calories,
      protein: e.protein,
      carbs: e.carbs,
      fat: e.fat,
      createdAt: e.createdAt.toISOString(),
    })),
  );
});

router.post("/meal-plan", async (req, res) => {
  const body = AddMealPlanBody.parse(req.body);

  const [inserted] = await db
    .insert(mealPlanTable)
    .values({
      userId: uid(req),
      date: body.date,
      mealName: body.mealName,
      category: body.category,
      calories: body.calories,
      protein: body.protein,
      carbs: body.carbs,
      fat: body.fat,
    })
    .returning();

  res.status(201).json({
    id: inserted.id,
    date: inserted.date,
    mealName: inserted.mealName,
    category: inserted.category,
    calories: inserted.calories,
    protein: inserted.protein,
    carbs: inserted.carbs,
    fat: inserted.fat,
    createdAt: inserted.createdAt.toISOString(),
  });
});

router.delete("/meal-plan/:id", async (req, res) => {
  const { id } = RemoveMealPlanParams.parse({ id: Number(req.params.id) });
  await db.delete(mealPlanTable).where(and(eq(mealPlanTable.id, id), eq(mealPlanTable.userId, uid(req))));
  res.status(204).send();
});

export default router;
