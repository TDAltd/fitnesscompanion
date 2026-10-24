import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, userProfileTable } from "@workspace/db";
import { computeTargets, type Targets } from "@workspace/plan";
import { uid } from "../lib/auth";

/**
 * Per-user target overrides (calories, protein, steps, water) set on the My plan page.
 * null means "use the value the plan calculates from my profile".
 */
const router = Router();

const LIMITS = {
  calorieTarget: [800, 6000],
  proteinTarget: [20, 400],
  stepsGoal: [1000, 50000],
  waterGoalLitres: [0.5, 8],
} as const;
type Key = keyof typeof LIMITS;

async function loadProfile(userId: number) {
  const [profile] = await db.select().from(userProfileTable).where(eq(userProfileTable.userId, userId)).limit(1);
  return profile;
}

/** The user's current targets (automatic values with their overrides applied). Used by habit tracking. */
export async function targetsForUser(userId: number): Promise<Targets> {
  const profile = await loadProfile(userId);
  return computeTargets(profile ?? {}, profile ?? {});
}

const toResponse = (p: Awaited<ReturnType<typeof loadProfile>>) => ({
  calorieTarget: p?.calorieTarget ?? null,
  proteinTarget: p?.proteinTarget ?? null,
  stepsGoal: p?.stepsGoal ?? null,
  waterGoalLitres: p?.waterGoalLitres ?? null,
});

router.get("/plan-overrides", async (req, res) => {
  res.json(toResponse(await loadProfile(uid(req))));
});

router.put("/plan-overrides", async (req, res) => {
  const userId = uid(req);
  const body = (req.body ?? {}) as Record<string, unknown>;
  const updates: Partial<Record<Key, number | null>> = {};

  for (const key of Object.keys(LIMITS) as Key[]) {
    if (!(key in body)) continue;
    const raw = body[key];
    if (raw === null || raw === "") {
      updates[key] = null;
      continue;
    }
    const n = Number(raw);
    const [min, max] = LIMITS[key];
    if (!Number.isFinite(n) || n < min || n > max) {
      res.status(400).json({ error: `${key} must be between ${min} and ${max}.` });
      return;
    }
    updates[key] = key === "waterGoalLitres" ? Math.round(n * 100) / 100 : Math.round(n);
  }

  const existing = await loadProfile(userId);
  if (!existing) {
    res.status(400).json({ error: "Finish setting up your profile first." });
    return;
  }
  const [updated] = await db
    .update(userProfileTable)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(userProfileTable.userId, userId))
    .returning();
  res.json(toResponse(updated));
});

export default router;
