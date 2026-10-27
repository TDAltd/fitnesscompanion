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
import { buildPlan } from "@workspace/plan";

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
  const habitsToday = await api<{ stepsDone: number }>("/habits/today");
  check("synced steps fill today's steps habit", habitsToday.body.stepsDone === 9123, JSON.stringify(habitsToday.body));

  // --- AI-style sentence becomes a short name
  const food = await api<{ name: string }>("/food-log", {
    method: "POST",
    body: JSON.stringify({ slot: "Dinner", name: "A mixed grill platter featuring various cuts of grill", servings: 1, calories: 600, protein: 40 }),
  });
  check("long AI sentence stored as a short name", food.body.name === "Mixed grill platter", food.body.name);

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
