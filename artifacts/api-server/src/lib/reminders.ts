import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  userProfileTable,
  habitLogsTable,
  mealPlanTable,
  workoutLogsTable,
  weightLogsTable,
  pushSubscriptionsTable,
  reminderSettingsTable,
  remindersSentTable,
} from "@workspace/db";
import { buildSchedule, buildSessions } from "@workspace/plan";
import { targetsForUser } from "../routes/planSettings";
import { dateInTz, DEFAULT_TZ, validTimezone } from "./dates";
import { sendToUser, type PushMessage } from "./push";
import { logger } from "./logger";

export type ReminderSettings = {
  water: boolean;
  workout: boolean;
  meals: boolean;
  weighIn: boolean;
  wakeTime: string;
  bedTime: string;
  workoutTime: string | null;
  weighInDay: number;
};

export const DEFAULT_SETTINGS: ReminderSettings = {
  water: true,
  workout: true,
  meals: true,
  weighIn: true,
  wakeTime: "07:00",
  bedTime: "22:00",
  workoutTime: null,
  weighInDay: 1,
};

const PREFERENCE_TIME: Record<string, string> = { Morning: "06:30", Afternoon: "12:30", Evening: "17:30" };
export const workoutTimeFor = (s: ReminderSettings, preference: string | null | undefined) =>
  s.workoutTime ?? PREFERENCE_TIME[preference ?? ""] ?? "17:30";

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const validTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/** Everything the rules need to know about one person, right now. */
export type ReminderState = {
  minutes: number; // local time of day
  weekday: number; // 0 = Sunday
  settings: ReminderSettings;
  workoutTime: string;
  trainingToday: string | null; // session title, or null on a rest day
  workoutDone: boolean;
  lunchLogged: boolean;
  dinnerLogged: boolean;
  weighedThisWeek: boolean;
  waterDone: number;
  waterTarget: number;
  sent: Set<string>;
};

const litres = (n: number) => (Math.round(n * 10) / 10).toString();

/**
 * Which reminder (if any) is due. At most one per run so phones don't buzz three times at once;
 * anything else that's due goes out on the next run.
 */
export function dueReminder(s: ReminderState): { kind: string; msg: PushMessage } | null {
  const wake = toMinutes(s.settings.wakeTime);
  const bed = toMinutes(s.settings.bedTime);
  if (s.minutes < wake || s.minutes >= bed) return null;
  const now = s.minutes;

  const wt = toMinutes(s.workoutTime);
  if (s.settings.workout && s.trainingToday && !s.workoutDone && !s.sent.has("workout") && now >= wt && now < wt + 180) {
    return {
      kind: "workout",
      msg: { title: "Time to train", body: `Today: ${s.trainingToday}. Tap to start your session.`, url: "/workout", tag: "workout" },
    };
  }

  if (s.settings.weighIn && s.weekday === s.settings.weighInDay && !s.weighedThisWeek && !s.sent.has("weigh-in") && now >= wake + 15 && now < wake + 240) {
    return {
      kind: "weigh-in",
      msg: { title: "Weigh-in day", body: "Step on the scale before breakfast, then log it. Once a week is enough.", url: "/body", tag: "weigh-in" },
    };
  }

  if (s.settings.meals && !s.lunchLogged && !s.sent.has("lunch") && now >= 14 * 60 + 30 && now < 17 * 60) {
    return {
      kind: "lunch",
      msg: { title: "Log lunch?", body: "Snap a photo or type what you had. It takes about 20 seconds.", url: "/eat", tag: "meal" },
    };
  }

  const dinnerAt = Math.min(20 * 60 + 30, bed - 60);
  if (s.settings.meals && !s.dinnerLogged && !s.sent.has("dinner") && now >= dinnerAt) {
    return {
      kind: "dinner",
      msg: { title: "Log dinner?", body: "Add tonight's meal so today's numbers are complete.", url: "/eat", tag: "meal" },
    };
  }

  // Smart water: only when you're at least a glass behind where you'd be by now
  if (s.settings.water && s.waterTarget > 0 && s.waterDone < s.waterTarget) {
    const start = wake + 120;
    const end = bed - 60;
    if (now >= start && now <= end && end > wake) {
      const expected = (s.waterTarget * (now - wake)) / (end - wake);
      const slot = `water-${Math.floor((now - wake) / 120)}`;
      if (s.waterDone <= expected - 0.5 && !s.sent.has(slot)) {
        return {
          kind: slot,
          msg: {
            title: "Water check",
            body: `${litres(s.waterDone)} of ${litres(s.waterTarget)} L so far. Have a glass now to stay on track.`,
            url: "/today",
            tag: "water",
            actions: [{ action: "log-water", title: "I drank a glass (+0.5 L)" }],
          },
        };
      }
    }
  }
  return null;
}

/** Local clock for a timezone: minutes since midnight and weekday. */
function localClock(now: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { minutes: Number(get("hour")) * 60 + Number(get("minute")), weekday: days.indexOf(get("weekday")) };
}

export async function settingsFor(userId: number): Promise<ReminderSettings> {
  const [row] = await db.select().from(reminderSettingsTable).where(eq(reminderSettingsTable.userId, userId));
  if (!row) return { ...DEFAULT_SETTINGS };
  const { userId: _u, updatedAt: _t, ...rest } = row;
  return rest;
}

/** Look at everyone with notifications switched on and send what's due. Safe to run as often as you like. */
export async function runReminders(now = new Date()): Promise<{ considered: number; sent: number }> {
  const people = await db
    .selectDistinct({ id: usersTable.id, timezone: usersTable.timezone })
    .from(pushSubscriptionsTable)
    .innerJoin(usersTable, eq(usersTable.id, pushSubscriptionsTable.userId))
    .where(and(isNull(usersTable.disabledAt), eq(usersTable.role, "user")));

  let sent = 0;
  for (const person of people) {
    try {
      const [profile] = await db.select().from(userProfileTable).where(eq(userProfileTable.userId, person.id));
      if (!profile) continue;
      const tz = validTimezone(person.timezone) ? person.timezone : DEFAULT_TZ;
      const today = dateInTz(now, tz);
      const { minutes, weekday } = localClock(now, tz);
      const settings = await settingsFor(person.id);
      if (!settings.water && !settings.workout && !settings.meals && !settings.weighIn) continue;

      const day = buildSchedule(profile).find((d) => d.day === weekday);
      const session = day && !day.rest ? buildSessions(profile).find((x) => x.id === day.sessionId) : undefined;
      const since = new Date(now.getTime() - 36 * 60 * 60 * 1000);
      const workouts = await db.select({ at: workoutLogsTable.loggedAt }).from(workoutLogsTable)
        .where(and(eq(workoutLogsTable.userId, person.id), gte(workoutLogsTable.loggedAt, since)));
      const meals = await db.select({ slot: mealPlanTable.category }).from(mealPlanTable)
        .where(and(eq(mealPlanTable.userId, person.id), eq(mealPlanTable.date, today)));
      const [weigh] = await db.select({ at: weightLogsTable.loggedAt }).from(weightLogsTable)
        .where(eq(weightLogsTable.userId, person.id)).orderBy(desc(weightLogsTable.loggedAt)).limit(1);
      const [habit] = await db.select().from(habitLogsTable)
        .where(and(eq(habitLogsTable.userId, person.id), eq(habitLogsTable.date, today)));
      const targets = await targetsForUser(person.id);
      const sentRows = await db.select({ kind: remindersSentTable.kind }).from(remindersSentTable)
        .where(and(eq(remindersSentTable.userId, person.id), eq(remindersSentTable.date, today)));

      const due = dueReminder({
        minutes,
        weekday,
        settings,
        workoutTime: workoutTimeFor(settings, profile.workoutTimePreference),
        trainingToday: session?.title ?? (day && !day.rest ? day.workout : null),
        workoutDone: workouts.some((w) => dateInTz(w.at, tz) === today),
        lunchLogged: meals.some((m) => m.slot === "Lunch"),
        dinnerLogged: meals.some((m) => m.slot === "Dinner"),
        weighedThisWeek: !!weigh && now.getTime() - weigh.at.getTime() < 5 * 24 * 60 * 60 * 1000,
        waterDone: habit?.waterDoneLitres ?? 0,
        waterTarget: targets.waterLitres,
        sent: new Set(sentRows.map((r) => r.kind)),
      });
      if (!due) continue;

      // Claim it first, so two runs at the same moment can't both send
      const claimed = await db.insert(remindersSentTable).values({ userId: person.id, date: today, kind: due.kind }).onConflictDoNothing().returning();
      if (!claimed.length) continue;
      const result = await sendToUser(person.id, due.msg);
      if (result.sent) sent++;
      else
        await db.delete(remindersSentTable).where(and(eq(remindersSentTable.userId, person.id), eq(remindersSentTable.date, today), eq(remindersSentTable.kind, due.kind)));
    } catch (err) {
      logger.warn({ err: (err as Error).message, userId: person.id }, "reminder check failed");
    }
  }

  // Keep the log small
  await db.delete(remindersSentTable).where(sql`${remindersSentTable.sentAt} < now() - interval '14 days'`);
  return { considered: people.length, sent };
}

let timer: NodeJS.Timeout | null = null;
/** While the app is awake, check every 5 minutes. The cPanel cron job covers the times it's asleep. */
export function startReminderLoop() {
  if (timer || process.env.REMINDERS_LOOP === "off") return;
  timer = setInterval(() => void runReminders().catch((err) => logger.warn({ err: (err as Error).message }, "reminder loop failed")), 5 * 60 * 1000);
  timer.unref();
}
