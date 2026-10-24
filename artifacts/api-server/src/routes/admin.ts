import { Router } from "express";
import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, sessionsTable, appSettingsTable } from "@workspace/db";
import { envAdmins, hashPassword, requireAdmin, signupsOpen, uid } from "../lib/auth";

/**
 * Admin dashboard API. Shows usage and profile basics only: never weights, meals, sleep or body data.
 */
const router = Router();
router.use("/admin", requireAdmin);

type Row = Record<string, unknown>;
const rows = async (q: ReturnType<typeof sql>) => (await db.execute(q)).rows as Row[];
const num = (v: unknown) => Number(v ?? 0);

// ---------- overview ----------

router.get("/admin/overview", async (_req, res) => {
  const [totals] = await rows(sql`
    SELECT
      (SELECT count(*) FROM users) AS total,
      (SELECT count(*) FROM users WHERE created_at >= now() - interval '7 days') AS new_7d,
      (SELECT count(*) FROM users WHERE created_at >= now() - interval '30 days') AS new_30d,
      (SELECT count(*) FROM users WHERE disabled_at IS NOT NULL) AS disabled,
      (SELECT count(DISTINCT user_id) FROM activity_days WHERE date = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD')) AS active_1d,
      (SELECT count(DISTINCT user_id) FROM activity_days WHERE date >= to_char((now() - interval '6 days') AT TIME ZONE 'UTC', 'YYYY-MM-DD')) AS active_7d,
      (SELECT count(DISTINCT user_id) FROM activity_days WHERE date >= to_char((now() - interval '29 days') AT TIME ZONE 'UTC', 'YYYY-MM-DD')) AS active_30d
  `);

  const signups = await rows(sql`
    SELECT to_char(d, 'YYYY-MM-DD') AS date,
           (SELECT count(*) FROM users u WHERE (u.created_at AT TIME ZONE 'UTC')::date = d) AS count
    FROM generate_series((now() AT TIME ZONE 'UTC')::date - 29, (now() AT TIME ZONE 'UTC')::date, interval '1 day') AS d
    ORDER BY d
  `);

  const total = num(totals.total);
  const [features] = await rows(sql`
    SELECT
      (SELECT count(*) FROM user_profile WHERE fitness_goal IS NOT NULL) AS onboarded,
      (SELECT count(DISTINCT user_id) FROM meal_plan_entries) AS meals,
      (SELECT count(DISTINCT user_id) FROM workout_logs) AS workouts,
      (SELECT count(DISTINCT user_id) FROM weight_logs) AS weight,
      (SELECT count(DISTINCT user_id) FROM habit_logs) AS habits,
      (SELECT count(*) FROM health_sync) AS apple_health,
      (SELECT count(DISTINCT user_id) FROM usage_events WHERE kind = 'ai_estimate') AS ai_estimates,
      (SELECT count(DISTINCT user_id) FROM body_measurements) AS measurements,
      (SELECT count(*) FROM user_profile WHERE calorie_target IS NOT NULL OR protein_target IS NOT NULL
                                           OR steps_goal IS NOT NULL OR water_goal_litres IS NOT NULL) AS custom_targets
  `);
  const feature = (key: string, label: string) => ({
    key,
    label,
    users: num(features[key]),
    percent: total ? Math.round((num(features[key]) / total) * 100) : 0,
  });

  // Retention: of people who signed up at least N days ago, how many came back on/after day N
  const retention = async (days: number) => {
    const [r] = await rows(sql`
      SELECT count(*) AS cohort,
             count(*) FILTER (WHERE EXISTS (
               SELECT 1 FROM activity_days a
               WHERE a.user_id = u.id AND a.date >= to_char((u.created_at + make_interval(days => ${days})) AT TIME ZONE 'UTC', 'YYYY-MM-DD')
             )) AS retained
      FROM users u
      WHERE u.created_at <= now() - make_interval(days => ${days})
    `);
    const cohort = num(r.cohort);
    return { days, cohort, retained: num(r.retained), percent: cohort ? Math.round((num(r.retained) / cohort) * 100) : null };
  };

  res.json({
    totals: {
      users: total,
      new7d: num(totals.new_7d),
      new30d: num(totals.new_30d),
      disabled: num(totals.disabled),
      active1d: num(totals.active_1d),
      active7d: num(totals.active_7d),
      active30d: num(totals.active_30d),
    },
    signups: signups.map((s) => ({ date: String(s.date), count: num(s.count) })),
    features: [
      feature("onboarded", "Finished setup"),
      feature("meals", "Planned meals"),
      feature("workouts", "Logged workouts"),
      feature("habits", "Used daily checklist"),
      feature("weight", "Logged weight"),
      feature("apple_health", "Connected Apple Health"),
      feature("ai_estimates", "Used AI meal estimates"),
      feature("measurements", "Logged measurements"),
      feature("custom_targets", "Set their own targets"),
    ],
    retention: [await retention(7), await retention(28)],
    signupsOpen: await signupsOpen(),
  });
});

// ---------- users ----------

router.get("/admin/users", async (_req, res) => {
  const list = await rows(sql`
    SELECT u.id, u.email, u.role, u.created_at, u.last_active_at, u.disabled_at,
           p.name, p.fitness_goal, p.workout_days_per_week, p.workout_location, p.training_experience,
           (SELECT count(*) FROM activity_days a WHERE a.user_id = u.id) AS active_days,
           (SELECT count(*) FROM meal_plan_entries m WHERE m.user_id = u.id) AS meals,
           (SELECT count(*) FROM workout_logs w WHERE w.user_id = u.id) AS workouts,
           (SELECT count(*) FROM weight_logs wl WHERE wl.user_id = u.id) AS weigh_ins,
           (SELECT count(*) FROM habit_logs h WHERE h.user_id = u.id) AS habit_days,
           (SELECT count(*) FROM usage_events e WHERE e.user_id = u.id AND e.kind = 'ai_estimate') AS ai_estimates,
           EXISTS (SELECT 1 FROM health_sync hs WHERE hs.user_id = u.id) AS apple_health
    FROM users u
    LEFT JOIN user_profile p ON p.user_id = u.id
    ORDER BY u.created_at DESC
  `);
  const admins = envAdmins();
  const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
  res.json(
    list.map((r) => ({
      id: num(r.id),
      email: String(r.email),
      name: (r.name as string | null) ?? null,
      isAdmin: r.role === "admin" || admins.includes(String(r.email)),
      adminFromSettings: admins.includes(String(r.email)),
      createdAt: iso(r.created_at),
      lastActiveAt: iso(r.last_active_at),
      disabled: r.disabled_at != null,
      profile: {
        goal: r.fitness_goal ?? null,
        daysPerWeek: r.workout_days_per_week ?? null,
        location: r.workout_location ?? null,
        experience: r.training_experience ?? null,
      },
      usage: {
        activeDays: num(r.active_days),
        meals: num(r.meals),
        workouts: num(r.workouts),
        weighIns: num(r.weigh_ins),
        habitDays: num(r.habit_days),
        aiEstimates: num(r.ai_estimates),
        appleHealth: Boolean(r.apple_health),
      },
    })),
  );
});

async function loadTarget(id: number) {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  return u ?? null;
}

async function adminCount() {
  const admins = envAdmins();
  const all = await db.select({ email: usersTable.email, role: usersTable.role, disabledAt: usersTable.disabledAt }).from(usersTable);
  return all.filter((u) => !u.disabledAt && (u.role === "admin" || admins.includes(u.email))).length;
}

/** Shared guard for actions on another account. Returns the target user or sends an error. */
async function guard(req: Parameters<Parameters<typeof router.post>[1]>[0], res: Parameters<Parameters<typeof router.post>[1]>[1], opts: { notSelf?: string } = {}) {
  const id = Number(req.params.id);
  const target = Number.isInteger(id) ? await loadTarget(id) : null;
  if (!target) {
    res.status(404).json({ error: "User not found." });
    return null;
  }
  if (opts.notSelf && target.id === uid(req)) {
    res.status(400).json({ error: opts.notSelf });
    return null;
  }
  return target;
}

router.post("/admin/users/:id/reset-password", async (req, res) => {
  const target = await guard(req, res);
  if (!target) return;
  // Readable temporary password, e.g. "kite-4821-moss"
  const words = ["kite", "moss", "river", "cedar", "pebble", "amber", "lotus", "maple", "ember", "coral", "willow", "sage"];
  const pick = () => words[randomBytes(1)[0] % words.length];
  const temp = `${pick()}-${1000 + (randomBytes(2).readUInt16BE() % 9000)}-${pick()}`;
  await db.update(usersTable).set({ passwordHash: await hashPassword(temp) }).where(eq(usersTable.id, target.id));
  await db.delete(sessionsTable).where(eq(sessionsTable.userId, target.id));
  req.log.info({ admin: uid(req), target: target.id }, "admin reset password");
  res.json({ tempPassword: temp });
});

router.post("/admin/users/:id/disable", async (req, res) => {
  const target = await guard(req, res, { notSelf: "You can't disable your own account." });
  if (!target) return;
  await db.update(usersTable).set({ disabledAt: new Date() }).where(eq(usersTable.id, target.id));
  await db.delete(sessionsTable).where(eq(sessionsTable.userId, target.id));
  req.log.info({ admin: uid(req), target: target.id }, "admin disabled user");
  res.json({ ok: true });
});

router.post("/admin/users/:id/enable", async (req, res) => {
  const target = await guard(req, res);
  if (!target) return;
  await db.update(usersTable).set({ disabledAt: null }).where(eq(usersTable.id, target.id));
  res.json({ ok: true });
});

router.post("/admin/users/:id/role", async (req, res) => {
  const role = req.body?.role === "admin" ? "admin" : "user";
  const target = await guard(req, res, role === "user" ? { notSelf: "You can't remove your own admin access." } : {});
  if (!target) return;
  if (role === "user" && envAdmins().includes(target.email)) {
    res.status(400).json({ error: "This person is an admin through the ADMIN_EMAILS setting in cPanel; remove them there." });
    return;
  }
  if (role === "user" && target.role === "admin" && (await adminCount()) <= 1) {
    res.status(400).json({ error: "There must be at least one admin." });
    return;
  }
  await db.update(usersTable).set({ role }).where(eq(usersTable.id, target.id));
  req.log.info({ admin: uid(req), target: target.id, role }, "admin changed role");
  res.json({ ok: true });
});

router.delete("/admin/users/:id", async (req, res) => {
  const target = await guard(req, res, { notSelf: "You can't delete your own account from here." });
  if (!target) return;
  if (req.body?.confirmEmail !== target.email) {
    res.status(400).json({ error: "Type the person's email address to confirm." });
    return;
  }
  if (target.role === "admin" && (await adminCount()) <= 1) {
    res.status(400).json({ error: "There must be at least one admin." });
    return;
  }
  // Every table references users with ON DELETE CASCADE, so this removes all their data
  await db.delete(usersTable).where(eq(usersTable.id, target.id));
  req.log.info({ admin: uid(req), target: target.id }, "admin deleted user");
  res.json({ ok: true });
});

// ---------- settings ----------

router.put("/admin/settings", async (req, res) => {
  if (typeof req.body?.signupsOpen !== "boolean") {
    res.status(400).json({ error: "signupsOpen must be true or false." });
    return;
  }
  const value = String(req.body.signupsOpen);
  await db
    .insert(appSettingsTable)
    .values({ key: "signups_open", value })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
  res.json({ signupsOpen: req.body.signupsOpen });
});

export default router;
