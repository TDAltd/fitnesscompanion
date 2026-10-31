/**
 * Consistency test: Today and Progress must tell the same story.
 *
 * Seeds a fresh user with rest days, an off-plan workout on a rest day, no weigh-ins and synced
 * Apple Health steps, then checks the API and (if Playwright is installed) the real screens.
 *
 *   pnpm --filter @workspace/scripts run test:consistency http://localhost:3998/fitnesscompanion
 *
 * Point it at a local or staging server, never at the live site: it creates (then deletes) a test account.
 */
import { createRequire } from "node:module";
import { buildPlan, computeTargets, isBirthday } from "@workspace/plan";

const BASE = (process.argv.slice(2).find((a) => a.startsWith("http")) ?? "http://localhost:3998/fitnesscompanion").replace(/\/$/, "");
const TZ = "Africa/Lagos";
const PASSWORD = "consistency-test-1";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${!ok && detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
};

let cookie = "";
async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<{ status: number; body: T }> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-timezone": TZ, cookie, ...(init.headers ?? {}) },
  });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  const text = await res.text();
  return { status: res.status, body: (text ? JSON.parse(text) : null) as T };
}

const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

async function main() {
  const email = `consistency-${Date.now()}@example.com`;
  const profile = {
    name: "Test", ageYears: 34, sex: "Female", heightCm: 165, currentWeightKg: 90, goalWeightKg: 75,
    activityLevel: "Lightly Active", fitnessGoal: "Weight loss", dietaryPreference: "No preference",
    workoutDaysPerWeek: 3, workoutLocation: "Home", trainingExperience: "Beginner",
    workoutTimePreference: "Evening", workoutDurationMinutes: 45, sleepHoursPerNight: 6,
  };

  check("sign up", (await api("/auth/signup", { method: "POST", body: JSON.stringify({ email, password: PASSWORD, consent: true }) })).status === 201);
  check("save profile", (await api("/profile", { method: "POST", body: JSON.stringify(profile) })).status === 200);

  type M = { milestones: { key: string; earned: boolean; seen: boolean; progress: { current: number } }[]; unseen: string[] };
  const before = await api<M>("/milestones"); // the app does this on first load
  check("new account starts with no milestones", before.body.milestones.every((m) => !m.earned), JSON.stringify(before.body.unseen));

  // Which of the last 7 days are rest days in this person's plan?
  const plan = buildPlan(profile);
  const restDays = new Set(plan.schedule.filter((d) => d.rest).map((d) => d.day));
  const last7 = Array.from({ length: 7 }, (_, i) => ymd(new Date(Date.now() - (6 - i) * 864e5)));
  const today = last7[6];
  const restDates = last7.filter((d) => restDays.has(weekday(d)) && d !== today);
  check("test week has at least 2 past rest days", restDates.length >= 2, `rest days: ${restDates.join(", ")}`);
  const [quietRest, yogaDay] = restDates;

  // Off-plan workout on a rest day
  await api("/workouts", { method: "POST", body: JSON.stringify({ name: "Yoga", type: "Flexibility", durationMins: 30, loggedAt: `${yogaDay}T09:00:00+01:00` }) });

  // --- Weight: setup weight is the first weigh-in, so every screen agrees
  const weights = await api<{ weightKg: number }[]>("/weight");
  check("starting weight saved as first weigh-in", weights.body.length === 1 && weights.body[0].weightKg === 90, JSON.stringify(weights.body));
  const summary = await api<{ startWeight: number; currentWeight: number; weightLost: number }>("/stats/summary");
  check("summary start = current = 90 kg, 0 lost", summary.body.startWeight === 90 && summary.body.currentWeight === 90 && summary.body.weightLost === 0, JSON.stringify(summary.body));
  await api("/profile", { method: "POST", body: JSON.stringify(profile) });
  check("re-saving the same answers doesn't add a weigh-in", (await api<unknown[]>("/weight")).body.length === 1);

  // --- Apple Health steps fill in the steps habit
  const key = (await api<{ key: string }>("/health-sync/key", { method: "POST" })).body.key;
  const sync = await fetch(`${BASE}/api/health-sync`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ date: today, steps: 9123, sleep: "6.5", activeEnergy: 300 }),
  });
  check("health sync accepted", sync.ok, String(sync.status));
  const syncBody = (await sync.json()) as { message: string; saved: Record<string, unknown> };
  check("sleep sent by an old Shortcut is ignored", !("sleepMinutes" in syncBody.saved) && !/sleep/i.test(syncBody.message), syncBody.message);
  const habitsToday = await api<{ stepsDone: number }>("/habits/today");
  check("synced steps fill today's steps habit", habitsToday.body.stepsDone === 9123, JSON.stringify(habitsToday.body));

  // --- AI-style sentence becomes a short name
  const food = await api<{ name: string }>("/food-log", {
    method: "POST",
    body: JSON.stringify({ slot: "Dinner", name: "A mixed grill platter featuring various cuts of grill", servings: 1, calories: 600, protein: 40 }),
  });
  check("long AI sentence stored as a short name", food.body.name === "Mixed grill platter", food.body.name);

  // --- Editing a logged food
  const id = (food.body as unknown as { id: number }).id;
  const moved = await api<{ slot: string; servings: number; calories: number }>(`/food-log/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ slot: "Lunch", servings: 1.5, calories: 900 }),
  });
  check("edit: move to another meal and change portions", moved.body.slot === "Lunch" && moved.body.servings === 1.5 && moved.body.calories === 900, JSON.stringify(moved.body));
  check("edit: future days are refused", (await api(`/food-log/${id}`, { method: "PATCH", body: JSON.stringify({ date: "2099-01-01" }) })).status === 400);
  check("edit: someone else's entry can't be changed", (await api(`/food-log/999999999`, { method: "PATCH", body: JSON.stringify({ slot: "Lunch" }) })).status === 404);

  // --- Milestones: one source of truth, no reward for very low days
  await api("/food-log", { method: "POST", body: JSON.stringify({ date: last7[1], slot: "Lunch", name: "Tiny snack", servings: 1, calories: 150, protein: 2 }) });
  const ms = await api<M>("/milestones");
  const get = (k: string) => ms.body.milestones.find((m) => m.key === k);
  check("first meal and first workout milestones earned and waiting to pop up", ms.body.unseen.includes("first-meal") && ms.body.unseen.includes("first-workout"), JSON.stringify(ms.body.unseen));
  check("a very low day doesn't count toward days logged", get("days-logged-3")?.progress.current === 0, String(get("days-logged-3")?.progress.current));
  await api("/milestones/seen", { method: "POST", body: JSON.stringify({ keys: ["first-meal"] }) });
  check("a seen milestone doesn't pop up again", !(await api<M>("/milestones")).body.unseen.includes("first-meal"));

  // --- Treat days: at most one in any 7 days
  // Editing a logged session
  type Detail = { id: number; name: string; durationMins: number; date: string; sets: { exercise: string; setNumber: number; weightKg: number | null; reps: number }[] };
  await api("/exercise-sets/session", { method: "POST", body: JSON.stringify({ title: "Test push", type: "Strength", durationMins: 40, sets: [
    { exercise: "Press", setNumber: 1, weightKg: 20, reps: 10 }, { exercise: "Press", setNumber: 2, weightKg: 20, reps: 8 }, { exercise: "Row", setNumber: 1, weightKg: 15, reps: 12 },
  ] }) });
  const wl = (await api<{ id: number; name: string }[]>("/workouts")).body.find((w) => w.name === "Test push");
  check("logged session appears in workouts", !!wl);
  if (wl) {
    const d1 = (await api<Detail>(`/workouts/${wl.id}/detail`)).body;
    check("session detail carries its sets", d1.sets?.length === 3, JSON.stringify(d1.sets));
    const patched = await api(`/workouts/${wl.id}`, { method: "PATCH", body: JSON.stringify({ name: "Push day", durationMins: 35, sets: [{ exercise: "Press", setNumber: 1, weightKg: 22.5, reps: 9 }] }) });
    const d2 = (await api<Detail>(`/workouts/${wl.id}/detail`)).body;
    check("edit session: name, minutes and sets replaced", patched.status === 200 && d2.name === "Push day" && d2.durationMins === 35 && d2.sets.length === 1 && d2.sets[0].weightKg === 22.5, JSON.stringify(d2));
    check("edit session: future day refused", (await api(`/workouts/${wl.id}`, { method: "PATCH", body: JSON.stringify({ date: "2099-01-01" }) })).status === 400);
    check("edit session: someone else's can't be changed", (await api(`/workouts/999999999`, { method: "PATCH", body: JSON.stringify({ name: "x" }) })).status === 404);
    const last = (await api<Record<string, unknown>>(`/exercise-sets/last?names=Press|Row`)).body;
    check("removed sets no longer feed 'last time'", !("Row" in last), JSON.stringify(last));
    await api(`/workouts/${wl.id}`, { method: "DELETE" });
    const after = (await api<Record<string, unknown>>(`/exercise-sets/last?names=Press|Row`)).body;
    check("deleting a session removes its sets", Object.keys(after).length === 0, JSON.stringify(after));
  }

  // Reminders
  type RS = { water: boolean; wakeTime: string; bedTime: string; workoutTime: string; weighInDay: number; devices: number };
  const rs = (await api<RS>("/reminders/settings")).body;
  check("reminders: sensible defaults", rs.water === true && rs.wakeTime === "07:00" && rs.bedTime === "22:00" && rs.workoutTime === "17:30" && rs.devices === 0, JSON.stringify(rs));
  const rs2 = await api<RS>("/reminders/settings", { method: "PUT", body: JSON.stringify({ water: false, wakeTime: "06:30", weighInDay: 5 }) });
  check("reminders: settings save", rs2.status === 200 && rs2.body.water === false && rs2.body.wakeTime === "06:30" && rs2.body.weighInDay === 5, JSON.stringify(rs2.body));
  check("reminders: bedtime before wake-up refused", (await api("/reminders/settings", { method: "PUT", body: JSON.stringify({ bedTime: "05:00" }) })).status === 400);
  check("reminders: bad time refused", (await api("/reminders/settings", { method: "PUT", body: JSON.stringify({ wakeTime: "7am" }) })).status === 400);
  const w0 = (await api<{ waterDoneLitres: number }>("/habits/today")).body.waterDoneLitres ?? 0;
  const g = await api<{ waterDoneLitres: number }>("/reminders/water-glass", { method: "POST" });
  check("reminders: 'I drank a glass' adds 0.5 L", g.status === 200 && Math.abs(g.body.waterDoneLitres - (w0 + 0.5)) < 0.01, `${w0} → ${g.body.waterDoneLitres}`);
  check("push: incomplete subscription refused", (await api("/push/subscribe", { method: "POST", body: JSON.stringify({ endpoint: "https://x.example/1" }) })).status === 400);
  check("push: test with no device explains itself", (await api("/push/test", { method: "POST" })).status === 409);
  check("push: public key available", ((await api<{ key: string }>("/push/public-key")).body.key ?? "").length > 40);
  check("cron: reminders need the key", (await api("/cron/reminders")).status === 403);

  check("treat day can be set today", (await api("/treats", { method: "PUT", body: JSON.stringify({ date: today, on: true }) })).status === 200);
  const second = await api("/treats", { method: "PUT", body: JSON.stringify({ date: last7[3], on: true }) });
  check("a second treat day in the same week is refused", second.status === 409, String(second.status));

  // --- Plan safety rules (pure engine checks)
  const t = (extra: Record<string, unknown>, overrides: Record<string, unknown> = {}) => computeTargets({ ...profile, ...extra }, overrides);
  const maintenance = t({}).maintenance ?? 0;
  check("pregnant: no calorie deficit", t({ healthFlags: ["pregnant"] }).calories >= maintenance - 25 && !t({ healthFlags: ["pregnant"] }).paceAvailable);
  check("eating-disorder history: no deficit, habit focus", t({ healthFlags: ["eating-disorder"] }).habitFocus && t({ healthFlags: ["eating-disorder"] }).calories >= maintenance - 25);
  check("diabetes: gentle pace only", JSON.stringify(t({ healthFlags: ["diabetes"] }).allowedPaces) === '["gentle"]' && t({ healthFlags: ["diabetes"] }, { pace: "faster" }).pace === "gentle");
  check("typed target can't go under the safe minimum", t({}, { calorieTarget: 900 }).calories === 1200, String(t({}, { calorieTarget: 900 }).calories));

  // --- Equipment changes home exercises (and their videos)
  const names = (equipment: string[]) => buildPlan({ ...profile, equipment }).sessions.flatMap((s) => s.exercises.map((e) => e.name));
  check("dumbbells swap in dumbbell moves at home", names(["dumbbells"]).includes("Dumbbell Goblet Squat") && !names([]).includes("Dumbbell Goblet Squat"));
  check("no kit: clear bodyweight names", names([]).includes("Bodyweight Squat"));

  // --- Birthday: age comes from the date of birth
  const dob = `${Number(today.slice(0, 4)) - 30}-${today.slice(5)}`;
  const withDob = await api<{ ageYears: number }>("/profile", { method: "POST", body: JSON.stringify({ ...profile, dateOfBirth: dob }) });
  check("date of birth sets age", withDob.body.ageYears === 30, String(withDob.body.ageYears));
  check("birthday is recognised", isBirthday(dob, today));
  check("silly birth dates are refused", (await api("/profile", { method: "POST", body: JSON.stringify({ ...profile, dateOfBirth: "2030-01-01" }) })).status === 400);

  // Close any milestone pop-ups first (they cover the page, as they should)
  const pending = (await api<M>("/milestones")).body.unseen;
  if (pending.length) await api("/milestones/seen", { method: "POST", body: JSON.stringify({ keys: pending }) });

  // --- Screens: Today's ring and Progress' today column use the same rules
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let playwright: any = null;
  try {
    // Optional, not a dependency of this repo: use a global install if there is one
    playwright = createRequire(import.meta.url)("playwright");
  } catch {
    console.log("· Playwright not installed: skipping screen checks");
  }
  if (playwright) {
    const browser = await playwright.chromium.launch();
    const url = new URL(BASE);
    const ctx = await browser.newContext({ timezoneId: TZ, viewport: { width: 1280, height: 900 } });
    const [name, value] = cookie.split("=");
    await ctx.addCookies([{ name, value, domain: url.hostname, path: url.pathname.replace(/\/?$/, "/") }]);
    const page = await ctx.newPage();

    await page.goto(`${BASE}/today`);
    await page.waitForLoadState("networkidle");
    const ring = await page.getByRole("img", { name: /done today/ }).getAttribute("aria-label");
    const [, ringDone, ringTotal] = ring?.match(/(\d+) of (\d+)/) ?? [];

    await page.goto(`${BASE}/progress`);
    await page.waitForLoadState("networkidle");
    await page.getByTestId(`score-${today}`).waitFor();
    const score = (await page.getByTestId(`score-${today}`).textContent())?.trim();
    check("Today ring matches Progress for today", score === `${ringDone}/${ringTotal}`, `ring ${ringDone}/${ringTotal}, progress ${score}`);

    const quiet = await page.getByTestId(`status-workout-${quietRest}`).getAttribute("data-status");
    check("rest day without a workout is neutral, not a win", quiet === "rest", `${quietRest}: ${quiet}`);
    const yoga = await page.getByTestId(`status-workout-${yogaDay}`).getAttribute("data-status");
    check("off-plan workout on a rest day counts", yoga === "met", `${yogaDay}: ${yoga}`);
    const progressStart = await page.getByText("No weight data logged yet").count();
    check("Progress shows the starting weigh-in", progressStart === 0);
    await browser.close();
  }

  // Clean up
  const del = await api("/account", { method: "DELETE", body: JSON.stringify({ password: PASSWORD }) });
  check("test account deleted", del.status === 204);

  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
