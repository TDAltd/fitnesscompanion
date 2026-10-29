import { Router } from "express";
import { and, between, desc, eq, gte, ne, sql } from "drizzle-orm";
import { targetsForUser } from "./planSettings";
import { db, habitLogsTable, mealPlanTable, usageEventsTable } from "@workspace/db";
import { uid } from "../lib/auth";
import { addDays, todayFor } from "../lib/dates";
import { tidyFoodName } from "../lib/food-name";

/**
 * Food diary (the Eat page). Uses the same table as the old meal plan, so existing entries,
 * the Today screen and exports keep working. Everything logged counts as eaten.
 */
const router = Router();

const SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
// Old entries used "Fruit" as a category; the diary shows them under Snacks
const toSlot = (c: string) => (SLOTS as readonly string[]).includes(c) ? c : "Snack";

const toEntry = (e: typeof mealPlanTable.$inferSelect) => ({
  id: e.id,
  date: e.date,
  slot: toSlot(e.category),
  name: e.mealName,
  servings: e.servings,
  calories: e.calories,
  protein: e.protein,
  carbs: e.carbs,
  fat: e.fat,
  createdAt: e.createdAt.toISOString(),
});

router.get("/food-log", async (req, res) => {
  const date = isDate(req.query.date) ? req.query.date : todayFor(req);
  const rows = await db
    .select()
    .from(mealPlanTable)
    .where(and(eq(mealPlanTable.userId, uid(req)), eq(mealPlanTable.date, date)))
    .orderBy(mealPlanTable.createdAt);
  res.json(rows.map(toEntry));
});

router.post("/food-log", async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === "string" ? tidyFoodName(b.name).slice(0, 120) : "";
  const slot = typeof b.slot === "string" && (SLOTS as readonly string[]).includes(b.slot) ? b.slot : null;
  const servings = Number(b.servings ?? 1);
  const per = (k: string, max: number) => {
    const n = Number(b[k] ?? 0);
    return Number.isFinite(n) && n >= 0 && n <= max ? n : NaN;
  };
  // Per-portion values come in; totals are stored
  const calories = per("calories", 5000);
  const protein = per("protein", 400);
  const carbs = per("carbs", 800);
  const fat = per("fat", 400);

  if (!name) return void res.status(400).json({ error: "Give the food a name." });
  if (!slot) return void res.status(400).json({ error: "Choose breakfast, lunch, dinner or snack." });
  if (!Number.isFinite(servings) || servings <= 0 || servings > 10) return void res.status(400).json({ error: "Portion must be between 0.25 and 10." });
  if ([calories, protein, carbs, fat].some(Number.isNaN)) return void res.status(400).json({ error: "Calories and macros must be sensible numbers." });

  const date = isDate(b.date) ? b.date : todayFor(req);
  const [row] = await db
    .insert(mealPlanTable)
    .values({
      userId: uid(req),
      date,
      mealName: name,
      category: slot,
      servings,
      calories: Math.round(calories * servings),
      protein: Math.round(protein * servings),
      carbs: Math.round(carbs * servings),
      fat: Math.round(fat * servings),
    })
    .returning();
  if (b.source === "quick" || b.source === "ai") {
    await db.insert(usageEventsTable).values({ userId: uid(req), kind: `food_${b.source}` }).catch(() => undefined);
  }
  res.status(201).json(toEntry(row));
});

router.delete("/food-log/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(mealPlanTable).where(and(eq(mealPlanTable.id, id), eq(mealPlanTable.userId, uid(req))));
  res.status(204).send();
});

/** Foods this person logged in the last 60 days, most-used first, as per-portion values. */
router.get("/food-log/recent", async (req, res) => {
  const since = addDays(todayFor(req), -60);
  const rows = await db
    .select({
      name: mealPlanTable.mealName,
      slot: sql<string>`(array_agg(${mealPlanTable.category} ORDER BY ${mealPlanTable.createdAt} DESC))[1]`,
      uses: sql<number>`count(*)::int`,
      last: sql<string>`max(${mealPlanTable.createdAt})`,
      calories: sql<number>`round(avg(${mealPlanTable.calories} / nullif(${mealPlanTable.servings}, 0)))::int`,
      protein: sql<number>`round(avg(${mealPlanTable.protein} / nullif(${mealPlanTable.servings}, 0)))::int`,
      carbs: sql<number>`round(avg(${mealPlanTable.carbs} / nullif(${mealPlanTable.servings}, 0)))::int`,
      fat: sql<number>`round(avg(${mealPlanTable.fat} / nullif(${mealPlanTable.servings}, 0)))::int`,
    })
    .from(mealPlanTable)
    .where(and(eq(mealPlanTable.userId, uid(req)), gte(mealPlanTable.date, since)))
    .groupBy(mealPlanTable.mealName)
    .orderBy(desc(sql`count(*)`), desc(sql`max(${mealPlanTable.createdAt})`))
    .limit(12);
  res.json(rows.map(({ last: _last, ...r }) => ({ ...r, name: tidyFoodName(r.name), slot: toSlot(r.slot) })));
});

/** Daily calorie/protein totals between two dates (for the weekly summary). */
router.get("/food-log/totals", async (req, res) => {
  const to = isDate(req.query.to) ? req.query.to : todayFor(req);
  const from = isDate(req.query.from) ? req.query.from : addDays(to, -6);
  const rows = await db
    .select({
      date: mealPlanTable.date,
      calories: sql<number>`sum(${mealPlanTable.calories})::int`,
      protein: sql<number>`sum(${mealPlanTable.protein})::int`,
    })
    .from(mealPlanTable)
    .where(and(eq(mealPlanTable.userId, uid(req)), between(mealPlanTable.date, from, to)))
    .groupBy(mealPlanTable.date);
  res.json(rows);
});

// ---------- planned treat meal ----------
/** Extra calories allowed on a planned treat day. At most one treat day in any 7 days. */
export const TREAT_KCAL = 300;

/** Treat days between two dates. GET /treats?from&to */
router.get("/treats", async (req, res) => {
  const to = isDate(req.query.to) ? req.query.to : todayFor(req);
  const from = isDate(req.query.from) ? req.query.from : addDays(to, -30);
  const rows = await db
    .select({ date: habitLogsTable.date })
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.userId, uid(req)), eq(habitLogsTable.treatMeal, true), between(habitLogsTable.date, from, to)));
  res.json({ extraKcal: TREAT_KCAL, dates: rows.map((r) => r.date).sort() });
});

/** Turn a treat day on or off. PUT /treats { date, on } */
router.put("/treats", async (req, res) => {
  const userId = uid(req);
  const date = isDate(req.body?.date) ? req.body.date : todayFor(req);
  const on = req.body?.on === true;
  if (on) {
    const targets = await targetsForUser(userId);
    if (targets.habitFocus) return void res.status(400).json({ error: "Treat days aren't part of your plan." });
    const [clash] = await db
      .select({ date: habitLogsTable.date })
      .from(habitLogsTable)
      .where(and(
        eq(habitLogsTable.userId, userId),
        eq(habitLogsTable.treatMeal, true),
        ne(habitLogsTable.date, date),
        between(habitLogsTable.date, addDays(date, -6), addDays(date, 6)),
      ))
      .limit(1);
    if (clash) return void res.status(409).json({ error: `You already have a treat day on ${clash.date}. One a week keeps you on track.` });
    await db
      .insert(habitLogsTable)
      .values({ userId, date, treatMeal: true, stepsGoal: targets.steps, waterGoalLitres: targets.waterLitres })
      .onConflictDoUpdate({ target: [habitLogsTable.userId, habitLogsTable.date], set: { treatMeal: true } });
  } else {
    await db.update(habitLogsTable).set({ treatMeal: false }).where(and(eq(habitLogsTable.userId, userId), eq(habitLogsTable.date, date)));
  }
  res.json({ date, on });
});

export default router;
