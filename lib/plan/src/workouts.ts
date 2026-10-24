import type { Exercise, PlanProfile, ScheduleDay, Session, SessionType } from "./types";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Which weekdays are training days, by number of days per week (0 = Sunday). */
const TRAINING_DAYS: Record<number, number[]> = {
  2: [2, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
};

/** Order of sessions across the week, by goal and number of days. */
const ROTATIONS: Record<string, Record<number, SessionType[]>> = {
  "Weight loss": {
    2: ["FULL", "INTERVALS"],
    3: ["FULL", "INTERVALS", "FULL"],
    4: ["LOWER", "INTERVALS", "UPPER", "CARDIO"],
    5: ["LOWER", "INTERVALS", "UPPER", "CORE", "LONG"],
    6: ["LOWER", "INTERVALS", "UPPER", "CORE", "FULL", "LONG"],
  },
  "Build strength": {
    2: ["FULL", "FULL"],
    3: ["LOWER", "UPPER", "FULL"],
    4: ["LOWER", "UPPER", "LOWER", "UPPER"],
    5: ["LOWER", "UPPER", "CORE", "LOWER", "UPPER"],
    6: ["LOWER", "UPPER", "CARDIO", "LOWER", "UPPER", "CORE"],
  },
  "Improve endurance": {
    2: ["CARDIO", "FULL"],
    3: ["CARDIO", "FULL", "LONG"],
    4: ["CARDIO", "FULL", "INTERVALS", "LONG"],
    5: ["CARDIO", "FULL", "INTERVALS", "CORE", "LONG"],
    6: ["CARDIO", "FULL", "INTERVALS", "CARDIO", "CORE", "LONG"],
  },
  "General fitness": {
    2: ["FULL", "CARDIO"],
    3: ["FULL", "CARDIO", "FULL"],
    4: ["LOWER", "CARDIO", "UPPER", "CORE"],
    5: ["FULL", "CARDIO", "CORE", "FULL", "LONG"],
    6: ["LOWER", "CARDIO", "UPPER", "CORE", "FULL", "LONG"],
  },
};

const SESSION_INFO: Record<SessionType, { title: string; focus: string }> = {
  FULL: { title: "Full-Body Strength", focus: "Work every major muscle group in one session" },
  LOWER: { title: "Lower Body Strength", focus: "Legs and glutes, the biggest calorie-burning muscles" },
  UPPER: { title: "Upper Body Strength", focus: "Arms, shoulders, chest and back" },
  CORE: { title: "Core & Mobility", focus: "A strong midsection and better posture; lower intensity" },
  CARDIO: { title: "Steady Cardio", focus: "Comfortable pace you can hold while talking" },
  INTERVALS: { title: "Cardio Intervals", focus: "Short hard efforts with easy recovery in between" },
  LONG: { title: "Long Easy Cardio", focus: "Your longest, gentlest session of the week" },
};

type Context = "gym" | "home" | "outdoors";

const yt = (name: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} proper form`)}`;

/** Exercise library: [name, reps] in priority order (shorter sessions use the first few). */
const STRENGTH: Record<"FULL" | "LOWER" | "UPPER" | "CORE", Record<Context, [string, string][]>> = {
  FULL: {
    gym: [["Goblet Squat", "10"], ["Lat Pulldown", "10"], ["Dumbbell Romanian Deadlift", "10"], ["Dumbbell Bench Press", "10"], ["Seated Cable Row", "12"], ["Plank Hold", "30-45s"]],
    home: [["Bodyweight Squat", "15"], ["Push-Ups (knees OK)", "8-12"], ["Glute Bridge", "15"], ["Backpack or Dumbbell Row", "12 each"], ["Reverse Lunge", "10 each"], ["Plank Hold", "30-45s"]],
    outdoors: [["Bodyweight Squat", "15"], ["Incline Push-Ups on a Bench", "10-12"], ["Walking Lunges", "10 each"], ["Bench Step-Ups", "10 each"], ["Bench Tricep Dips", "10-12"], ["Plank Hold", "30-45s"]],
  },
  LOWER: {
    gym: [["Leg Press", "12"], ["Romanian Deadlift", "10"], ["Walking Lunges", "10 each"], ["Hip Thrust", "12"], ["Leg Curl Machine", "12"], ["Calf Raises", "15"]],
    home: [["Goblet or Bodyweight Squat", "15"], ["Single-Leg Glute Bridge", "10 each"], ["Reverse Lunge", "10 each"], ["Step-Ups on a Sturdy Chair", "10 each"], ["Wall Sit", "30-45s"], ["Calf Raises", "20"]],
    outdoors: [["Jump Squats (or Squats)", "12"], ["Walking Lunges", "12 each"], ["Bench Step-Ups", "12 each"], ["Lateral Lunges", "10 each"], ["Wall Sit", "30-45s"], ["Hill or Stair Calf Raises", "20"]],
  },
  UPPER: {
    gym: [["Dumbbell Shoulder Press", "10"], ["Lat Pulldown", "10"], ["Incline Dumbbell Press", "10"], ["Seated Cable Row", "12"], ["Bicep Curls", "12"], ["Tricep Pushdowns", "12"]],
    home: [["Push-Ups (knees OK)", "8-12"], ["Backpack or Dumbbell Row", "12 each"], ["Pike Push-Ups", "8"], ["Chair Tricep Dips", "12"], ["Hammer Curls (water bottles OK)", "12"], ["Lateral Raises", "15"]],
    outdoors: [["Incline Push-Ups on a Bench", "10-12"], ["Bench Tricep Dips", "12"], ["Australian Rows (low bar)", "8-10"], ["Pike Push-Ups", "8"], ["Bear Crawl", "20 m"], ["Plank Shoulder Taps", "10 each"]],
  },
  CORE: {
    gym: [["Dead Bugs", "10 each"], ["Cable Woodchop", "10 each"], ["Hanging Knee Raises", "10"], ["Side Plank", "20-30s each"], ["Bird Dog", "10 each"], ["Hip Flexor & Hamstring Stretch", "45s each"]],
    home: [["Dead Bugs", "10 each"], ["Plank Hold", "30-45s"], ["Bird Dog", "10 each"], ["Side Plank", "20-30s each"], ["Glute Bridge", "15"], ["Cat-Cow & Child's Pose", "60s"]],
    outdoors: [["Plank Hold", "30-45s"], ["Mountain Climbers", "20"], ["Dead Bugs", "10 each"], ["Side Plank", "20-30s each"], ["Bench Leg Raises", "10"], ["Hip & Hamstring Stretch", "45s each"]],
  },
};

/** Cardio blocks: what to do, by context. Time split is filled in from the session length. */
const CARDIO_MODE: Record<Context, string> = {
  gym: "treadmill, bike, rower or cross-trainer",
  home: "brisk walk, skipping, step-ups or a dance/cardio video",
  outdoors: "brisk walk, jog or cycle",
};

const SETS: Record<string, number> = { Beginner: 2, Intermediate: 3, Advanced: 4 };

function contextFor(location: string | null | undefined, type: SessionType): Context {
  if (location === "Gym") return "gym";
  if (location === "Outdoors") return "outdoors";
  if (location === "Mixed") return type === "CARDIO" || type === "LONG" ? "outdoors" : "gym";
  return "home";
}

function exerciseCount(minutes: number): number {
  if (minutes <= 15) return 3;
  if (minutes <= 30) return 4;
  if (minutes <= 45) return 5;
  return 6;
}

function cardioExercises(type: "CARDIO" | "INTERVALS" | "LONG", ctx: Context, minutes: number, experience: string): Exercise[] {
  const mode = CARDIO_MODE[ctx];
  const warm = minutes <= 15 ? 3 : 5;
  if (type === "INTERVALS") {
    const work = experience === "Advanced" ? 40 : experience === "Intermediate" ? 30 : 20;
    const rest = 60 - work;
    // one round = 1 minute; cap at 20 hard efforts, the rest of the time is easy cardio
    const rounds = Math.min(20, Math.max(4, minutes - warm * 2));
    const leftover = minutes - warm * 2 - rounds;
    return [
      { name: `Warm-up: easy ${mode}`, sets: 1, reps: `${warm} min`, url: yt("cardio warm up") },
      { name: `Hard effort (${mode})`, sets: rounds, reps: `${work}s hard / ${rest}s easy`, url: yt("interval training beginners") },
      ...(leftover >= 5
        ? [{ name: `Easy steady ${mode}`, sets: 1, reps: `${leftover} min`, url: yt("zone 2 cardio") }]
        : []),
      { name: "Cool-down walk & stretch", sets: 1, reps: `${warm} min`, url: yt("cool down stretch after cardio") },
    ];
  }
  const total = type === "LONG" ? longMinutes(minutes) : minutes;
  return [
    { name: `Warm-up: easy ${mode}`, sets: 1, reps: `${warm} min`, url: yt("cardio warm up") },
    {
      name: type === "LONG" ? `Long easy ${mode}` : `Steady ${mode}`,
      sets: 1,
      reps: `${Math.max(10, total - warm * 2)} min`,
      url: yt(ctx === "home" ? "low impact cardio at home" : "zone 2 cardio"),
    },
    { name: "Cool-down & stretch", sets: 1, reps: `${warm} min`, url: yt("cool down stretch after cardio") },
  ];
}

function rotationFor(p: PlanProfile): SessionType[] {
  const days = clampDays(p.workoutDaysPerWeek);
  const goal = ROTATIONS[p.fitnessGoal ?? ""] ? (p.fitnessGoal as string) : "General fitness";
  let rotation = [...ROTATIONS[goal][days]];
  // Beginners start with steady cardio instead of hard intervals
  if (p.trainingExperience === "Beginner") {
    rotation = rotation.map((t) => (t === "INTERVALS" ? "CARDIO" : t));
  }
  return rotation;
}

/** Long session: 1.5x a normal session, between 30 and 75 minutes */
const longMinutes = (m: number) => Math.min(75, Math.max(30, Math.round((m * 1.5) / 5) * 5));

const clampDays = (d: number | null | undefined) => Math.min(6, Math.max(2, d ?? 3));

export function buildSchedule(p: PlanProfile): ScheduleDay[] {
  const trainingDays = TRAINING_DAYS[clampDays(p.workoutDaysPerWeek)];
  const rotation = rotationFor(p);
  const time = p.workoutTimePreference && p.workoutTimePreference !== "Flexible" ? ` (${p.workoutTimePreference.toLowerCase()})` : "";
  return DAY_NAMES.map((label, day) => {
    const idx = trainingDays.indexOf(day);
    if (idx === -1) {
      return {
        day,
        label,
        rest: true,
        sessionId: null,
        workout: day === 0 ? "Full rest" : "Rest or a relaxed 20-min walk",
      };
    }
    const type = rotation[idx];
    return { day, label, rest: false, sessionId: type, workout: `${SESSION_INFO[type].title}${time}` };
  });
}

export function buildSessions(p: PlanProfile): Session[] {
  const schedule = buildSchedule(p);
  const minutes = p.workoutDurationMinutes ?? 45;
  const experience = p.trainingExperience ?? "Beginner";
  const sets = SETS[experience] ?? 2;
  const timeLabel = p.workoutTimePreference && p.workoutTimePreference !== "Flexible" ? p.workoutTimePreference : null;

  const order: SessionType[] = [];
  for (const d of schedule) if (d.sessionId && !order.includes(d.sessionId)) order.push(d.sessionId);

  return order.map((type) => {
    const days = schedule.filter((d) => d.sessionId === type).map((d) => d.day);
    const ctx = contextFor(p.workoutLocation, type);
    const duration = type === "LONG" ? longMinutes(minutes) : minutes;
    const exercises: Exercise[] =
      type === "CARDIO" || type === "INTERVALS" || type === "LONG"
        ? cardioExercises(type, ctx, minutes, experience)
        : STRENGTH[type][ctx].slice(0, exerciseCount(minutes)).map(([name, reps]) => ({
            name,
            sets: type === "CORE" ? Math.max(2, sets - 1) : sets,
            reps,
            url: yt(name),
          }));

    let note: string | undefined;
    if (type === "FULL" || type === "LOWER" || type === "UPPER") {
      note =
        experience === "Beginner"
          ? "Pick a weight you could lift 2-3 more times. Rest 60-90s between sets. Form first."
          : "Add a little weight or a few reps each week while form stays clean.";
    } else if (type === "INTERVALS") {
      note = "Hard means you can only say a few words. Skip intervals if you feel unwell or very sore.";
    } else if (type === "CORE") {
      note = "Move slowly and breathe out on the effort. Stop if your lower back hurts.";
    }

    return {
      id: type,
      title: SESSION_INFO[type].title,
      focus: SESSION_INFO[type].focus,
      days,
      durationMinutes: duration,
      when: [days.map((d) => SHORT[d]).join(" & "), timeLabel, `${duration} min`].filter(Boolean).join(" · "),
      exercises,
      note,
    };
  });
}
