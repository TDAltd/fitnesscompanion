import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { buildPlan, DAY_NAMES, EQUIPMENT, PACES, type Pace, type PlanProfile } from "@workspace/plan";
import { getGetProfileQueryKey } from "@workspace/api-client-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Illustration } from "@/components/start/illustrations";
import { AUTH_QUERY_KEY, type AuthUser } from "@/lib/auth";
import { withBase } from "@/lib/base-path";
import { cn } from "@/lib/utils";
import AuthPage from "@/pages/auth";

/* ------------------------------------------------------------------ answers */

type Answers = {
  fitnessGoal?: string;
  sex?: string;
  dobDay?: number;
  dobMonth?: number; // 1-12
  dobYear?: number;
  healthFlags: string[];
  healthAnswered?: boolean;
  heightCm?: number;
  heightUnit: "cm" | "ft";
  weightKg?: number;
  weightUnit: "kg" | "lb";
  goalWeightKg?: number;
  pace?: Pace;
  activityLevel?: string;
  workload?: string;
  trainingExperience?: string;
  workoutLocation?: string;
  equipment: string[];
  workoutDaysPerWeek?: number;
  workoutDurationMinutes?: number;
  workoutTimePreference?: string;
  dietaryPreference?: string;
  habits: string[]; // may include "other"
  habitOther: string;
  why: string;
  name: string;
};

const EMPTY: Answers = {
  healthFlags: [],
  heightUnit: "cm",
  weightUnit: "kg",
  equipment: [],
  habits: [],
  habitOther: "",
  why: "",
  name: "",
};

const STORE = "fc-start-v1";
function loadSaved(): { answers: Answers; step: string } | null {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { answers: { ...EMPTY, ...parsed.answers, habits: parsed.answers?.habits ?? [] }, step: parsed.step };
  } catch {
    return null;
  }
}
function save(answers: Answers, step: string) {
  try {
    localStorage.setItem(STORE, JSON.stringify({ answers, step }));
  } catch {
    /* private mode: answers just won't survive a reload */
  }
}
function clearSaved() {
  try {
    localStorage.removeItem(STORE);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ options */

type Opt = { value: string; label: string; sub?: string; emoji?: string; art?: string };

const GOALS: Opt[] = [
  { value: "Weight loss", label: "Lose weight", sub: "At a pace you can keep", art: "Weight loss" },
  { value: "Build strength", label: "Get stronger", sub: "Build muscle and strength", art: "Build strength" },
  { value: "Improve endurance", label: "More stamina", sub: "Walk, run and climb stairs easier", art: "Improve endurance" },
  { value: "General fitness", label: "Feel healthier", sub: "Move more, eat better", art: "General fitness" },
];
const SEXES: Opt[] = [
  { value: "Female", label: "Female", emoji: "👩🏾" },
  { value: "Male", label: "Male", emoji: "👨🏾" },
  { value: "Prefer not to say", label: "Prefer not to say", emoji: "🙂" },
];
const ACTIVITY: Opt[] = [
  { value: "Sedentary", label: "Mostly sitting", sub: "Desk, car, sofa", art: "Sedentary" },
  { value: "Lightly Active", label: "A little movement", sub: "Some walking most days", art: "Lightly Active" },
  { value: "Moderately Active", label: "On my feet a lot", sub: "Teaching, shop floor, errands", art: "Moderately Active" },
  { value: "Very Active", label: "Physical all day", sub: "Manual work, lots of walking", art: "Very Active" },
];
const WORKLOAD: Opt[] = [
  { value: "9 to 5", label: "9 to 5", emoji: "☀️" },
  { value: "Shifts or nights", label: "Shifts or nights", emoji: "🌙" },
  { value: "Flexible", label: "It's fairly flexible", emoji: "🙂" },
  { value: "At home", label: "At home or retired", emoji: "🌴" },
  { value: "Student", label: "Student", emoji: "📚" },
];
const EXPERIENCE: Opt[] = [
  { value: "Beginner", label: "I'm just getting started", emoji: "🌱" },
  { value: "Intermediate", label: "I have a routine I know", emoji: "👍🏾" },
  { value: "Advanced", label: "Training is part of my week", emoji: "💪🏾" },
];
const LOCATIONS: Opt[] = [
  { value: "Home", label: "At home", art: "Home" },
  { value: "Gym", label: "At a gym", art: "Gym" },
  { value: "Outdoors", label: "Outside", art: "Outdoors" },
  { value: "Mixed", label: "A mix of places", art: "Mixed" },
];
const TIMES: Opt[] = [
  { value: "Morning", label: "Morning", emoji: "🌅" },
  { value: "Midday", label: "Midday", emoji: "☀️" },
  { value: "Evening", label: "Evening", emoji: "🌆" },
  { value: "Flexible", label: "It changes", emoji: "🔀" },
];
const FOOD: Opt[] = [
  { value: "No preference", label: "I eat everything", emoji: "🍲" },
  { value: "High-protein", label: "High-protein", emoji: "🍗" },
  { value: "Pescatarian", label: "Fish, no meat", emoji: "🐟" },
  { value: "Vegetarian", label: "Vegetarian", emoji: "🥗" },
  { value: "Vegan", label: "Vegan", emoji: "🌱" },
];
const HABITS: Opt[] = [
  { value: "sweets and biscuits", label: "Sweets and biscuits", emoji: "🍪" },
  { value: "sugary drinks", label: "Sugary drinks", emoji: "🥤" },
  { value: "fried snacks", label: "Fried snacks", emoji: "🍟" },
  { value: "late-night snacks", label: "Late-night eating", emoji: "🌙" },
  { value: "alcohol", label: "Alcohol", emoji: "🍺" },
  { value: "other", label: "Something else", emoji: "✏️" },
];
const HEALTH: (Opt & { women?: boolean })[] = [
  { value: "pregnant", label: "I'm pregnant", emoji: "🤰🏾", women: true },
  { value: "breastfeeding", label: "I'm breastfeeding", emoji: "🍼", women: true },
  { value: "diabetes", label: "I have diabetes or take blood-sugar medicine", emoji: "🩸" },
  { value: "eating-disorder", label: "I have had an eating disorder", emoji: "💛" },
];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* ------------------------------------------------------------------ helpers */

const pad = (n: number) => String(n).padStart(2, "0");
const dobIso = (a: Answers) => (a.dobYear && a.dobMonth && a.dobDay ? `${a.dobYear}-${pad(a.dobMonth)}-${pad(a.dobDay)}` : null);
function ageFrom(a: Answers) {
  if (!a.dobYear || !a.dobMonth || !a.dobDay) return null;
  const now = new Date();
  let age = now.getFullYear() - a.dobYear;
  if (now.getMonth() + 1 < a.dobMonth || (now.getMonth() + 1 === a.dobMonth && now.getDate() < a.dobDay)) age--;
  return age;
}
const kgToLb = (kg: number) => Math.round(kg * 2.20462);
const lbToKg = (lb: number) => Math.round((lb / 2.20462) * 10) / 10;
const cmToFtIn = (cm: number) => {
  const inches = Math.round(cm / 2.54);
  return { ft: Math.floor(inches / 12), inch: inches % 12 };
};
const ftInToCm = (ft: number, inch: number) => Math.round((ft * 12 + inch) * 2.54);
const flagged = (a: Answers, ...f: string[]) => f.some((x) => a.healthFlags.includes(x));
const noWeightGoal = (a: Answers) => flagged(a, "eating-disorder", "pregnant", "breastfeeding");
// Unanswered goal counts as "asks", so the "4 / 18" total doesn't jump after the first answer
const asksGoalWeight = (a: Answers) => !noWeightGoal(a) && (!a.fitnessGoal || a.fitnessGoal === "Weight loss" || a.fitnessGoal === "General fitness");

/** "sugary drinks and fried snacks": one daily tick-box covering every habit picked. */
function habitText(a: Answers): string | null {
  const list = (a.habits ?? []).map((h) => (h === "other" ? a.habitOther.trim() : h)).filter(Boolean);
  if (!list.length) return null;
  const text = list.length === 1 ? list[0] : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
  return text.slice(0, 80);
}

function toPlanProfile(a: Answers): PlanProfile {
  return {
    name: a.name.trim() || null,
    ageYears: ageFrom(a),
    dateOfBirth: dobIso(a),
    sex: a.sex ?? null,
    heightCm: a.heightCm ?? null,
    currentWeightKg: a.weightKg ?? null,
    goalWeightKg: asksGoalWeight(a) ? a.goalWeightKg ?? a.weightKg ?? null : a.weightKg ?? null,
    activityLevel: a.activityLevel ?? null,
    fitnessGoal: a.fitnessGoal ?? null,
    dietaryPreference: a.dietaryPreference ?? null,
    guiltyPleasure: habitText(a),
    workoutDaysPerWeek: a.workoutDaysPerWeek,
    workoutLocation: a.workoutLocation ?? null,
    trainingExperience: a.trainingExperience ?? null,
    workoutTimePreference: a.workoutTimePreference ?? null,
    workoutDurationMinutes: a.workoutDurationMinutes,
    healthFlags: a.healthFlags,
    equipment: a.workoutLocation === "Gym" ? [] : a.equipment,
  };
}

/** Body the profile API expects. */
function profileBody(a: Answers) {
  const p = toPlanProfile(a);
  return {
    ...p,
    name: a.name.trim(),
    why: a.why.trim() || null,
    dailySchedule: a.workload ? `Work: ${a.workload}` : null,
    sleepHoursPerNight: null,
    mealSchedule: null,
    waterIntakeLiters: null,
  };
}

/** When the goal weight is reached at a pace, rounded up to the month (weight loss slows near the goal). */
function goalDate(a: Answers, pace: Pace): { date: Date; weeks: number } | null {
  if (!a.weightKg || !a.goalWeightKg || a.goalWeightKg >= a.weightKg) return null;
  const t = buildPlan(toPlanProfile(a), { pace }).targets;
  const perWeek = Math.abs(t.weeklyChangeKg);
  if (!perWeek) return null;
  const weeks = Math.ceil((a.weightKg - a.goalWeightKg) / perWeek);
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return { date: d, weeks };
}
const monthYear = (d: Date) => d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

/* ------------------------------------------------------------------ steps */

type StepId =
  | "welcome" | "goal" | "sex" | "birthday" | "health" | "height" | "weight" | "goalWeight" | "goalDate"
  | "activity" | "workload" | "experience" | "location" | "equipment" | "days" | "time" | "food" | "habit"
  | "why" | "name" | "building" | "preview" | "account";

/** Screens that aren't questions don't count toward "4 / 18". */
const NOT_COUNTED: StepId[] = ["welcome", "goalDate", "building", "preview", "account"];

function stepsFor(a: Answers, member: boolean): StepId[] {
  const t = a.weightKg ? buildPlan(toPlanProfile(a)).targets : null;
  const showGoalDate =
    (asksGoalWeight(a) && t?.paceAvailable && a.goalWeightKg != null && a.weightKg != null && a.goalWeightKg < a.weightKg) || noWeightGoal(a);
  const list: (StepId | false)[] = [
    !member && "welcome",
    "goal", "sex", "birthday", "health", "height", "weight",
    asksGoalWeight(a) && "goalWeight",
    showGoalDate && "goalDate",
    "activity", "workload", "experience", "location",
    a.workoutLocation !== "Gym" && "equipment",
    "days", "time", "food", "habit", "why", "name", "building", "preview",
    !member && "account",
  ];
  return list.filter(Boolean) as StepId[];
}

/* ------------------------------------------------------------------ page */

/**
 * Sign-up quiz: one question per screen, one tap each. Answers are saved on the phone after every
 * tap, and the account is created at the very end. `member` = already logged in but no profile yet.
 */
export default function StartPage({ member = false }: { member?: boolean }) {
  const saved = useMemo(loadSaved, []);
  const [answers, setAnswers] = useState<Answers>(saved?.answers ?? EMPTY);
  const steps = stepsFor(answers, member);
  const [step, setStep] = useState<StepId>(() => {
    const s = saved?.step as StepId | undefined;
    if (s && s !== "building" && steps.includes(s)) return s === "welcome" ? "welcome" : s;
    return steps[0];
  });
  const [showLogin, setShowLogin] = useState(false);
  const [signupsOpen, setSignupsOpen] = useState(true);

  useEffect(() => {
    if (member) return;
    fetch(withBase("/api/auth/config"))
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => c && setSignupsOpen(c.signupsOpen !== false))
      .catch(() => undefined);
  }, [member]);

  useEffect(() => {
    save(answers, step);
  }, [answers, step]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const set = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }));
  const idx = steps.indexOf(step);
  const next = (patch?: Partial<Answers>) => {
    const merged = patch ? { ...answers, ...patch } : answers;
    if (patch) setAnswers(merged);
    const list = stepsFor(merged, member);
    const i = list.indexOf(step);
    setStep(list[Math.min(i + 1, list.length - 1)]);
  };
  const back = () => idx > 0 && setStep(steps[idx - 1]);

  if (!member && (showLogin || !signupsOpen)) {
    return <AuthPage onCreateAccount={signupsOpen ? () => setShowLogin(false) : undefined} />;
  }

  const counted = steps.filter((s) => !NOT_COUNTED.includes(s));
  const position = counted.indexOf(step) + 1;
  const total = counted.length;

  return (
    <main className="onboarding-page min-h-[100dvh]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
        {step !== "welcome" && step !== "building" && (
          <header className="mb-6">
            <div className="flex h-11 items-center justify-between">
              {idx > (member ? 0 : 1) || (step === "goal" && !member) ? (
                <button type="button" onClick={back} className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted" aria-label="Back" data-testid="button-quiz-back">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              ) : (
                <span />
              )}
              {position > 0 && (
                <span className="text-sm font-semibold tabular-nums" data-testid="text-quiz-progress">
                  {position} <span className="text-muted-foreground">/ {total}</span>
                </span>
              )}
            </div>
            {position > 0 && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${(position / total) * 100}%` }} />
              </div>
            )}
          </header>
        )}

        <div className="flex flex-1 flex-col" key={step} data-testid={`quiz-step-${step}`}>
          <Step step={step} a={answers} set={set} next={next} member={member} onLogin={() => setShowLogin(true)} hasSaved={!!saved && saved.step !== "welcome"} />
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ building blocks */

function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6 text-center">
      <h1 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.03em]">{children}</h1>
      {sub && <p className="mt-2 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Choice({ opt, selected, onClick, multi }: { opt: Opt; selected: boolean; onClick: () => void; multi?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-[64px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-transparent bg-card shadow-sm hover:border-primary/30",
      )}
      data-testid={`choice-${opt.value || "none"}`}
    >
      {multi && (
        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2", selected ? "border-primary-foreground bg-primary-foreground text-primary" : "border-muted-foreground/40")}>
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold leading-snug">{opt.label}</span>
        {opt.sub && <span className={cn("mt-0.5 block text-sm", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>{opt.sub}</span>}
      </span>
      {opt.art ? (
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl", selected ? "bg-primary-foreground" : "bg-muted/60")}>
          <Illustration id={opt.art} className="h-12 w-12" />
        </span>
      ) : opt.emoji ? (
        <span className="shrink-0 text-3xl leading-none" aria-hidden>{opt.emoji}</span>
      ) : null}
    </button>
  );
}

/** Single choice: tapping an answer moves on by itself. */
function Pick({ options, value, onPick }: { options: Opt[]; value?: string; onPick: (v: string) => void }) {
  const [chosen, setChosen] = useState(value);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <div className="space-y-3">
      {options.map((o) => (
        <Choice
          key={o.value}
          opt={o}
          selected={chosen === o.value}
          onClick={() => {
            setChosen(o.value);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => onPick(o.value), 220);
          }}
        />
      ))}
    </div>
  );
}

function Footer({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-0 -mx-4 mt-auto bg-gradient-to-t from-background via-background to-transparent px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-6">{children}</div>;
}

function Next({ onClick, disabled, children = "Continue" }: { onClick: () => void; disabled?: boolean; children?: ReactNode }) {
  return (
    <Button className="h-14 w-full rounded-2xl text-base" onClick={onClick} disabled={disabled} data-testid="button-quiz-continue">
      {children}
    </Button>
  );
}

function UnitToggle<T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div className="mx-auto mb-8 flex w-fit rounded-full bg-muted p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn("h-10 min-w-[72px] rounded-full px-4 text-sm font-semibold", value === o ? "bg-foreground text-background" : "text-muted-foreground")}
          aria-pressed={value === o}
        >
          {o === "ft" ? "ft / in" : o}
        </button>
      ))}
    </div>
  );
}

/** A big empty number you type on the number keypad. Reports undefined until it's a number. */
function NumberField({ value, onChange, unit, label, decimal, testId, autoFocus }: { value?: number; onChange: (n: number | undefined) => void; unit: string; label: string; decimal?: boolean; testId?: string; autoFocus?: boolean }) {
  const [text, setText] = useState(value != null ? String(value) : "");
  return (
    <label className="flex items-baseline justify-center gap-1.5">
      <span className="sr-only">{label}</span>
      <input
        type="text"
        inputMode={decimal ? "decimal" : "numeric"}
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="0"
        value={text}
        onChange={(e) => {
          const t = e.target.value.replace(decimal ? /[^\d.,]/g : /\D/g, "").slice(0, decimal ? 5 : 3);
          setText(t);
          const n = Number(t.replace(",", "."));
          onChange(t && Number.isFinite(n) && n > 0 ? n : undefined);
        }}
        className="w-[3.2ch] bg-transparent text-center text-6xl font-semibold tabular-nums tracking-tight placeholder:text-foreground/15 focus:outline-none"
        style={{ width: `${Math.max(1, text.length || 1) + 0.4}ch` }}
        data-testid={testId}
      />
      <span className="text-xl font-semibold text-muted-foreground">{unit}</span>
    </label>
  );
}

function Hint({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "warn" }) {
  return (
    <p className={cn("mx-auto mt-8 max-w-xs rounded-2xl p-4 text-center text-sm shadow-sm", tone === "warn" ? "bg-[hsl(var(--dusk)/0.15)] text-foreground" : "bg-card text-muted-foreground")} data-testid="text-number-hint">
      {children}
    </p>
  );
}

function FeetInches({ cm, onChange }: { cm?: number; onChange: (cm: number | undefined) => void }) {
  const start = cm ? cmToFtIn(cm) : null;
  const [ft, setFt] = useState<number | undefined>(start?.ft);
  const [inch, setInch] = useState<number | undefined>(start?.inch);
  const update = (f?: number, i?: number) => onChange(f != null ? ftInToCm(f, i ?? 0) : undefined);
  return (
    <div className="flex justify-center gap-6">
      <NumberField autoFocus label="Feet" value={ft} onChange={(n) => { setFt(n); update(n, inch); }} unit="ft" testId="input-height-ft" />
      <NumberField label="Inches" value={inch} onChange={(n) => { setInch(n); update(ft, n); }} unit="in" testId="input-height-in" />
    </div>
  );
}

const range = (from: number, to: number, step = 1) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

/* ------------------------------------------------------------------ each screen */

function Step({ step, a, set, next, member, onLogin, hasSaved }: { step: StepId; a: Answers; set: (p: Partial<Answers>) => void; next: (p?: Partial<Answers>) => void; member: boolean; onLogin: () => void; hasSaved: boolean }) {
  switch (step) {
    case "welcome":
      return (
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between pt-2">
            <Logo />
            <button type="button" onClick={onLogin} className="h-11 px-2 text-sm font-semibold text-primary" data-testid="button-quiz-login">
              Log in
            </button>
          </div>
          <div className="my-auto py-10 text-center">
            <div className="mx-auto mb-8 grid w-fit grid-cols-2 gap-3">
              {["General fitness", "Home", "Improve endurance", "Build strength"].map((id) => (
                <span key={id} className="flex h-20 w-20 items-center justify-center rounded-2xl bg-card shadow-sm">
                  <Illustration id={id} className="h-16 w-16" />
                </span>
              ))}
            </div>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-[-0.045em]">Your plan in about 90 seconds</h1>
            <p className="mx-auto mt-4 max-w-sm text-base text-muted-foreground">
              Tap through a few questions. We'll build workouts, meals and daily targets that fit your real week.
            </p>
          </div>
          <Footer>
            <Next onClick={() => next()}>{hasSaved ? "Continue where I left off" : "Get my plan"}</Next>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button type="button" onClick={onLogin} className="font-semibold text-primary">Log in</button>
            </p>
          </Footer>
        </div>
      );

    case "goal":
      return (
        <>
          <Title>What's your main goal?</Title>
          <Pick options={GOALS} value={a.fitnessGoal} onPick={(v) => next({ fitnessGoal: v })} />
        </>
      );

    case "sex":
      return (
        <>
          <Title sub="Used to work out your calories.">What's your sex?</Title>
          <Pick
            options={SEXES}
            value={a.sex}
            onPick={(v) =>
              next({
                sex: v,
                healthFlags: v === "Male" ? a.healthFlags.filter((f) => f !== "pregnant" && f !== "breastfeeding") : a.healthFlags,
              })
            }
          />
        </>
      );

    case "birthday": {
      const year = new Date().getFullYear();
      const ok = !!(a.dobDay && a.dobMonth && a.dobYear) && (ageFrom(a) ?? 0) >= 13;
      const daysIn = a.dobYear && a.dobMonth ? new Date(a.dobYear, a.dobMonth, 0).getDate() : 31;
      const sel = "h-14 w-full rounded-2xl border-0 bg-card px-3 text-center text-lg font-semibold shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
      return (
        <>
          <Title sub="For your age, and a little celebration on the day 🎂">When's your birthday?</Title>
          <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
            <select aria-label="Day" className={sel} value={a.dobDay ?? ""} onChange={(e) => set({ dobDay: Number(e.target.value) })} data-testid="select-dob-day">
              <option value="" disabled>Day</option>
              {range(1, daysIn).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select aria-label="Month" className={sel} value={a.dobMonth ?? ""} onChange={(e) => set({ dobMonth: Number(e.target.value) })} data-testid="select-dob-month">
              <option value="" disabled>Month</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select aria-label="Year" className={sel} value={a.dobYear ?? ""} onChange={(e) => set({ dobYear: Number(e.target.value) })} data-testid="select-dob-year">
              <option value="" disabled>Year</option>
              {range(year - 90, year - 13).reverse().map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {ok && <p className="mt-6 text-center text-sm text-muted-foreground" data-testid="text-age">You're {ageFrom(a)}.</p>}
          <Footer>
            <Next onClick={() => next()} disabled={!ok} />
          </Footer>
        </>
      );
    }

    case "health": {
      const opts = HEALTH.filter((h) => !h.women || a.sex !== "Male");
      const toggle = (v: string) => set({ healthFlags: a.healthFlags.includes(v) ? a.healthFlags.filter((f) => f !== v) : [...a.healthFlags, v] });
      return (
        <>
          <Title sub="Private. These keep your plan safe, for example no calorie cut during pregnancy.">Do any of these apply to you?</Title>
          <div className="space-y-3">
            {opts.map((o) => (
              <Choice key={o.value} opt={o} multi selected={a.healthFlags.includes(o.value)} onClick={() => toggle(o.value)} />
            ))}
          </div>
          <Footer>
            {a.healthFlags.length ? (
              <Next onClick={() => next({ healthAnswered: true })} />
            ) : (
              <Next onClick={() => next({ healthAnswered: true, healthFlags: [] })}>None of these</Next>
            )}
          </Footer>
        </>
      );
    }

    case "height": {
      const cm = a.heightCm;
      const ftIn = cm ? cmToFtIn(cm) : null;
      const ok = cm != null && cm >= 120 && cm <= 230;
      return (
        <>
          <Title>How tall are you?</Title>
          <UnitToggle value={a.heightUnit} options={["cm", "ft"]} onChange={(u) => set({ heightUnit: u })} />
          {a.heightUnit === "cm" ? (
            <NumberField key="cm" autoFocus label="Height in cm" value={cm} onChange={(n) => set({ heightCm: n })} unit="cm" testId="input-height" />
          ) : (
            <FeetInches key="ft" cm={cm} onChange={(n) => set({ heightCm: n })} />
          )}
          {cm != null && !ok && <Hint tone="warn">Check the number: we expect between {a.heightUnit === "cm" ? "120 and 230 cm" : "4 ft and 7 ft 6 in"}.</Hint>}
          {ok && a.heightUnit === "ft" && ftIn && <Hint>That's {cm} cm.</Hint>}
          <Footer>
            <Next onClick={() => next()} disabled={!ok} />
          </Footer>
        </>
      );
    }

    case "weight": {
      const kg = a.weightKg;
      const ok = kg != null && kg >= 30 && kg <= 350;
      return (
        <>
          <Title sub="Your starting point. Only you can see it.">What do you weigh now?</Title>
          <UnitToggle value={a.weightUnit} options={["kg", "lb"]} onChange={(u) => set({ weightUnit: u })} />
          {a.weightUnit === "kg" ? (
            <NumberField key="kg" autoFocus decimal label="Weight in kg" value={kg != null ? Math.round(kg * 10) / 10 : undefined} onChange={(n) => set({ weightKg: n })} unit="kg" testId="input-weight" />
          ) : (
            <NumberField key="lb" autoFocus label="Weight in lb" value={kg != null ? kgToLb(kg) : undefined} onChange={(n) => set({ weightKg: n != null ? lbToKg(n) : undefined })} unit="lb" testId="input-weight-lb" />
          )}
          {kg != null && !ok ? (
            <Hint tone="warn">Check the number: we expect between {a.weightUnit === "kg" ? "30 and 350 kg" : "66 and 770 lb"}.</Hint>
          ) : (
            <Hint>No crash diets. Your plan aims for a steady pace you can keep up.</Hint>
          )}
          <Footer>
            <Next onClick={() => next()} disabled={!ok} />
          </Footer>
        </>
      );
    }

    case "goalWeight": {
      const now = a.weightKg ?? 0;
      const goal = a.goalWeightKg;
      // Never below a healthy weight for their height (BMI 18.5)
      const floorKg = a.heightCm ? Math.ceil(18.5 * (a.heightCm / 100) ** 2) : 30;
      const tooLow = goal != null && goal < floorKg;
      const ok = goal != null && goal >= 30 && goal <= 350 && !tooLow;
      const diff = goal != null ? Math.round((now - goal) * 10) / 10 : 0;
      const pace = ok ? buildPlan(toPlanProfile({ ...a, goalWeightKg: goal })).targets.pace ?? "gentle" : "gentle";
      const when = ok ? goalDate({ ...a, goalWeightKg: goal }, pace) : null;
      const show = (k: number) => (a.weightUnit === "kg" ? `${Math.round(k * 10) / 10} kg` : `${kgToLb(k)} lb`);
      return (
        <>
          <Title sub={`You weigh ${show(now)} now. Pick what feels realistic; you can change it any time.`}>What weight are you aiming for?</Title>
          <UnitToggle value={a.weightUnit} options={["kg", "lb"]} onChange={(u) => set({ weightUnit: u })} />
          {a.weightUnit === "kg" ? (
            <NumberField key="gkg" autoFocus decimal label="Goal weight in kg" value={goal != null ? Math.round(goal * 10) / 10 : undefined} onChange={(n) => set({ goalWeightKg: n })} unit="kg" testId="input-goal-weight" />
          ) : (
            <NumberField key="glb" autoFocus label="Goal weight in lb" value={goal != null ? kgToLb(goal) : undefined} onChange={(n) => set({ goalWeightKg: n != null ? lbToKg(n) : undefined })} unit="lb" testId="input-goal-weight-lb" />
          )}
          {goal == null ? (
            <div className="mt-8 text-center">
              <button type="button" className="h-11 rounded-full px-4 text-sm font-semibold text-primary hover:bg-primary/10" onClick={() => next({ goalWeightKg: now })} data-testid="button-keep-weight">
                I'm happy at my current weight
              </button>
            </div>
          ) : tooLow ? (
            <Hint tone="warn">That's below a healthy weight for your height. Pick {show(floorKg)} or more.</Hint>
          ) : !ok ? (
            <Hint tone="warn">Check the number.</Hint>
          ) : (
            <Hint>
              {diff > 0.4 ? (
                <>
                  That's <b className="text-foreground">{show(diff)}</b> to go
                  {when ? <>: about <b className="text-foreground">{when.weeks < 9 ? `${when.weeks} weeks` : `${Math.round(when.weeks / 4.35)} months`}</b> at a safe pace.</> : "."}
                </>
              ) : diff < -0.4 ? (
                "Aiming to gain? Your plan will focus on strength and enough food."
              ) : (
                "Staying where you are: your plan focuses on fitness and habits."
              )}
            </Hint>
          )}
          <Footer>
            <Next onClick={() => next()} disabled={!ok} />
          </Footer>
        </>
      );
    }

    case "goalDate":
      return <GoalDateScreen a={a} set={set} next={next} />;

    case "activity":
      return (
        <>
          <Title sub="Not counting workouts.">How active is a normal day?</Title>
          <Pick options={ACTIVITY} value={a.activityLevel} onPick={(v) => next({ activityLevel: v })} />
        </>
      );

    case "workload":
      return (
        <>
          <Title>What does your week look like?</Title>
          <Pick
            options={WORKLOAD}
            value={a.workload}
            onPick={(v) => next({ workload: v })}
          />
        </>
      );

    case "experience":
      return (
        <>
          <Title>How does training feel for you?</Title>
          <Pick options={EXPERIENCE} value={a.trainingExperience} onPick={(v) => next({ trainingExperience: v })} />
        </>
      );

    case "location":
      return (
        <>
          <Title>Where will you work out?</Title>
          <Pick options={LOCATIONS} value={a.workoutLocation} onPick={(v) => next({ workoutLocation: v })} />
        </>
      );

    case "equipment": {
      const toggle = (v: string) => set({ equipment: a.equipment.includes(v) ? a.equipment.filter((e) => e !== v) : [...a.equipment, v] });
      return (
        <>
          <Title sub="Tick all you have. No kit is fine: bodyweight works.">What do you have to work out with?</Title>
          <div className="grid grid-cols-2 gap-2.5">
            {EQUIPMENT.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => toggle(e.id)}
                aria-pressed={a.equipment.includes(e.id)}
                className={cn(
                  "flex min-h-[56px] items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left text-sm font-semibold",
                  a.equipment.includes(e.id) ? "border-primary bg-primary text-primary-foreground" : "border-transparent bg-card shadow-sm",
                )}
                data-testid={`kit-${e.id}`}
              >
                {a.equipment.includes(e.id) && <Check className="h-4 w-4 shrink-0" strokeWidth={3} />}
                {e.label}
              </button>
            ))}
          </div>
          <Footer>
            <Next onClick={() => next()}>{a.equipment.length ? "Continue" : "I don't have any"}</Next>
          </Footer>
        </>
      );
    }

    case "days":
      return (
        <>
          <Title>How much time can you give it?</Title>
          <p className="mb-3 text-sm font-semibold">Days a week</p>
          <div className="mb-8 grid grid-cols-5 gap-2">
            {[2, 3, 4, 5, 6].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => set({ workoutDaysPerWeek: d })}
                aria-pressed={a.workoutDaysPerWeek === d}
                className={cn("h-16 rounded-2xl text-2xl font-semibold", a.workoutDaysPerWeek === d ? "bg-primary text-primary-foreground" : "bg-card shadow-sm")}
                data-testid={`days-${d}`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="mb-3 text-sm font-semibold">Minutes each time</p>
          <div className="grid grid-cols-4 gap-2">
            {[15, 30, 45, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set({ workoutDurationMinutes: m })}
                aria-pressed={a.workoutDurationMinutes === m}
                className={cn("h-14 rounded-2xl text-lg font-semibold", a.workoutDurationMinutes === m ? "bg-primary text-primary-foreground" : "bg-card shadow-sm")}
                data-testid={`minutes-${m}`}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {a.workoutDaysPerWeek && a.workoutDurationMinutes
              ? `Starting small is fine. ${a.workoutDaysPerWeek} × ${a.workoutDurationMinutes} min is ${a.workoutDaysPerWeek * a.workoutDurationMinutes} minutes a week.`
              : "Starting small is fine. You can change this later."}
          </p>
          <Footer>
            <Next onClick={() => next()} disabled={!a.workoutDaysPerWeek || !a.workoutDurationMinutes} />
          </Footer>
        </>
      );

    case "time":
      return (
        <>
          <Title>When suits you best?</Title>
          <Pick options={TIMES} value={a.workoutTimePreference} onPick={(v) => next({ workoutTimePreference: v })} />
        </>
      );

    case "food":
      return (
        <>
          <Title sub="Meal ideas will match this.">How do you eat?</Title>
          <Pick options={FOOD} value={a.dietaryPreference} onPick={(v) => next({ dietaryPreference: v })} />
        </>
      );

    case "habit": {
      const list = a.habits ?? [];
      const toggle = (v: string) => set({ habits: list.includes(v) ? list.filter((h) => h !== v) : [...list, v] });
      const otherMissing = list.includes("other") && !a.habitOther.trim();
      return (
        <>
          <Title sub="Pick as many as you like. They become one daily tick-box.">What's hardest to resist?</Title>
          <div className="space-y-3">
            {HABITS.map((o) => (
              <div key={o.value}>
                <Choice opt={o} multi selected={list.includes(o.value)} onClick={() => toggle(o.value)} />
                {o.value === "other" && list.includes("other") && (
                  <Input
                    autoFocus
                    value={a.habitOther}
                    onChange={(e) => set({ habitOther: e.target.value.slice(0, 40) })}
                    placeholder="e.g. chin chin, ice cream"
                    className="mt-2 h-14 rounded-2xl text-base"
                    data-testid="input-habit-other"
                  />
                )}
              </div>
            ))}
          </div>
          {habitText(a) && <p className="mt-4 text-center text-sm text-muted-foreground" data-testid="text-habit-preview">Your daily tick-box: <b className="text-foreground">No {habitText(a)}</b></p>}
          <Footer>
            {list.length ? (
              <Next onClick={() => next()} disabled={otherMissing} />
            ) : (
              <Next onClick={() => next({ habits: [] })}>Nothing in particular</Next>
            )}
          </Footer>
        </>
      );
    }

    case "why":
      return (
        <>
          <Title sub="We'll remind you of this on harder days. Optional.">Why does this matter to you?</Title>
          <textarea
            value={a.why}
            onChange={(e) => set({ why: e.target.value.slice(0, 200) })}
            rows={3}
            placeholder="e.g. to keep up with my kids, to feel strong again"
            className="w-full rounded-2xl border-0 bg-card p-4 text-base shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="input-why"
          />
          <Footer>
            <Next onClick={() => next()}>{a.why.trim() ? "Continue" : "Skip"}</Next>
          </Footer>
        </>
      );

    case "name":
      return (
        <>
          <Title>Last one: what should we call you?</Title>
          <Input
            autoFocus
            value={a.name}
            onChange={(e) => set({ name: e.target.value.slice(0, 60) })}
            placeholder="Your first name"
            autoComplete="given-name"
            className="h-14 rounded-2xl text-center text-lg"
            onKeyDown={(e) => e.key === "Enter" && a.name.trim().length >= 2 && next()}
            data-testid="input-name"
          />
          <Footer>
            <Next onClick={() => next()} disabled={a.name.trim().length < 2}>Build my plan</Next>
          </Footer>
        </>
      );

    case "building":
      return <Building onDone={() => next()} />;

    case "preview":
      return <Preview a={a} member={member} next={next} />;

    case "account":
      return <Account a={a} onLogin={onLogin} />;
  }
}

/* ------------------------------------------------------------------ goal date */

function GoalDateScreen({ a, set, next }: { a: Answers; set: (p: Partial<Answers>) => void; next: () => void }) {
  if (noWeightGoal(a)) {
    const ed = flagged(a, "eating-disorder");
    return (
      <div className="flex flex-1 flex-col">
        <div className="my-auto text-center">
          <p className="mb-4 text-5xl" aria-hidden>{ed ? "💛" : "🤰🏾"}</p>
          <Title
            sub={
              ed
                ? "Regular, balanced meals and daily movement. No calorie cutting, no weight targets. A doctor or dietitian can help you set goals that feel safe."
                : "No calorie cut while pregnant or breastfeeding. Your plan keeps you eating enough and moving gently. Follow your midwife's or doctor's advice."
            }
          >
            {ed ? "Your plan focuses on habits, not the scale" : "Your plan looks after you both"}
          </Title>
        </div>
        <Footer>
          <Next onClick={() => next()} />
        </Footer>
      </div>
    );
  }

  const t = buildPlan(toPlanProfile(a), a.pace ? { pace: a.pace } : {}).targets;
  const pace = (a.pace && t.allowedPaces.includes(a.pace) ? a.pace : t.pace) ?? "gentle";
  const when = goalDate(a, pace);
  const unit = a.weightUnit;
  const show = (kg: number) => (unit === "kg" ? `${Math.round(kg)} kg` : `${kgToLb(kg)} lb`);
  // Simple honest curve: monthly points at the chosen pace
  const months = Math.max(1, Math.ceil((when?.weeks ?? 4) / 4.35));
  const perMonth = ((a.weightKg ?? 0) - (a.goalWeightKg ?? 0)) / months;
  const points = Array.from({ length: Math.min(months, 12) + 1 }, (_, i) => {
    const m = months <= 12 ? i : Math.round((i * months) / 12);
    return { m, kg: (a.weightKg ?? 0) - perMonth * m };
  });

  return (
    <div className="flex flex-1 flex-col">
      <Title sub="At a pace that's safe to keep up.">
        <span className="text-primary" data-testid="text-goal-date">{show(a.goalWeightKg ?? 0)} by {when ? monthYear(when.date) : "—"}</span>
      </Title>

      <div className="rounded-2xl bg-card p-4 shadow-sm">
        <svg viewBox="0 0 300 140" className="w-full" role="img" aria-label={`From ${show(a.weightKg ?? 0)} now to ${show(a.goalWeightKg ?? 0)} by ${when ? monthYear(when.date) : ""}`}>
          {points.map((p, i) => {
            const x = 20 + (i / (points.length - 1 || 1)) * 260;
            const y = 20 + (i / (points.length - 1 || 1)) * 90 + Math.sin((i / (points.length - 1 || 1)) * Math.PI) * -6;
            return <circle key={i} cx={x} cy={y} r={i === 0 || i === points.length - 1 ? 6 : 2.5} fill={i === points.length - 1 ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.35)"} />;
          })}
          <path
            d={points.map((_, i) => {
              const x = 20 + (i / (points.length - 1 || 1)) * 260;
              const y = 20 + (i / (points.length - 1 || 1)) * 90 + Math.sin((i / (points.length - 1 || 1)) * Math.PI) * -6;
              return `${i ? "L" : "M"}${x} ${y}`;
            }).join(" ")}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text x="20" y="10" fontSize="12" fill="hsl(var(--foreground))" fontWeight="600">{show(a.weightKg ?? 0)}</text>
          <text x="280" y="134" fontSize="12" textAnchor="end" fill="hsl(var(--primary))" fontWeight="700">{show(a.goalWeightKg ?? 0)}</text>
          <text x="20" y="134" fontSize="11" fill="hsl(var(--muted-foreground))">Now</text>
        </svg>
      </div>

      <p className="mb-2 mt-6 text-sm font-semibold">Your pace</p>
      <div className="space-y-2">
        {(["gentle", "steady", "faster"] as Pace[]).filter((p) => t.allowedPaces.includes(p)).map((p) => {
          const w = goalDate(a, p);
          return (
            <button
              key={p}
              type="button"
              onClick={() => set({ pace: p })}
              aria-pressed={pace === p}
              className={cn("flex min-h-[56px] w-full items-center justify-between rounded-2xl border-2 px-4 text-left", pace === p ? "border-primary bg-primary/10" : "border-transparent bg-card shadow-sm")}
              data-testid={`pace-${p}`}
            >
              <span>
                <span className="block font-semibold">{PACES[p].label}</span>
                <span className="block text-xs text-muted-foreground">{PACES[p].perWeek}</span>
              </span>
              <span className="text-sm font-semibold">{w ? monthYear(w.date) : ""}</span>
            </button>
          );
        })}
      </div>
      {t.allowedPaces.length === 1 && <p className="mt-2 text-xs text-muted-foreground">With diabetes the plan keeps to a gentle pace.</p>}
      <Footer>
        <Next onClick={() => next()} />
      </Footer>
    </div>
  );
}

/* ------------------------------------------------------------------ building + preview */

function Building({ onDone }: { onDone: () => void }) {
  const lines = ["Working out your daily targets", "Matching workouts to your week", "Picking meal ideas you'll like"];
  const [done, setDone] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setDone((d) => d + 1), 550);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (done > lines.length) onDone();
  }, [done, lines.length, onDone]);
  return (
    <div className="my-auto py-16">
      <Loader2 className="mx-auto mb-8 h-10 w-10 animate-spin text-primary" />
      <h1 className="mb-6 text-center text-2xl font-semibold">Building your plan</h1>
      <ul className="mx-auto w-fit space-y-3">
        {lines.map((l, i) => (
          <li key={l} className={cn("flex items-center gap-3 text-base transition-opacity", i < done ? "opacity-100" : "opacity-40")}>
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", i < done ? "bg-primary text-primary-foreground" : "bg-muted")}>
              {i < done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Preview({ a, member, next }: { a: Answers; member: boolean; next: () => void }) {
  const plan = buildPlan(toPlanProfile(a), a.pace ? { pace: a.pace } : {});
  const t = plan.targets;
  const training = plan.schedule.filter((d) => !d.rest);
  const order = [1, 2, 3, 4, 5, 6, 0];
  const days = order.filter((d) => training.some((x) => x.day === d)).map((d) => DAY_NAMES[d].slice(0, 3));
  const save = useSaveMember(a);
  const rows: [string, string, string][] = [
    t.habitFocus ? ["🍽️", "Regular, balanced meals", "3 meals a day, no counting"] : ["🔥", `${t.calories.toLocaleString()} kcal a day`, t.pace ? `${PACES[t.pace].label} pace, ${PACES[t.pace].perWeek}` : "Enough to fuel your goal"],
    ["🍗", `${t.protein} g protein`, "Keeps you full and protects muscle"],
    ["🏋🏾", `${training.length} workouts a week`, `${days.join(", ")} · ${a.workoutDurationMinutes} min`],
    ["👟", `${t.steps.toLocaleString()} steps a day`, "Walking counts more than you think"],
    ["💧", `${t.waterLitres} L of water`, "About " + Math.round((t.waterLitres * 1000) / 250) + " glasses"],
  ];
  return (
    <div className="flex flex-1 flex-col">
      <Title sub="Built from your answers. You can adjust any of it later in My plan.">{a.name.trim() ? `${a.name.trim().split(" ")[0]}, here's your plan` : "Here's your plan"}</Title>
      <ul className="space-y-2.5" data-testid="plan-preview">
        {rows.map(([icon, title, sub]) => (
          <li key={title} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
            <span className="text-2xl" aria-hidden>{icon}</span>
            <span>
              <span className="block font-semibold">{title}</span>
              <span className="block text-sm text-muted-foreground">{sub}</span>
            </span>
          </li>
        ))}
      </ul>
      {save.error && <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{save.error}</p>}
      <Footer>
        {member ? (
          <Next onClick={() => void save.run()} disabled={save.busy}>
            {save.busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Start my plan
          </Next>
        ) : (
          <Next onClick={() => next()}>Save my plan</Next>
        )}
      </Footer>
    </div>
  );
}

/* ------------------------------------------------------------------ saving */

async function postJson(path: string, body: unknown, method = "POST") {
  const res = await fetch(withBase(path), { method, credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error((data && data.error) || `Something went wrong (${res.status}).`), { status: res.status });
  return data;
}

async function saveProfile(a: Answers) {
  await postJson("/api/profile", profileBody(a));
  if (a.pace) await postJson("/api/plan-overrides", { pace: a.pace }, "PUT").catch(() => undefined);
}

/** Logged in but no profile yet: save and go. */
function useSaveMember(a: Answers) {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return {
    busy,
    error,
    run: async () => {
      setBusy(true);
      setError(null);
      try {
        await saveProfile(a);
        clearSaved();
        await qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        setLocation("/today");
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
  };
}

function Account({ a, onLogin }: { a: Answers; onLogin: () => void }) {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);

  const submit = async () => {
    setError(null);
    setExists(false);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Check your email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!consent) return setError("Please agree to the privacy notice to continue.");
    setBusy(true);
    try {
      const user = (await postJson("/api/auth/signup", { email: email.trim(), password, consent })) as AuthUser;
      // Save the answers before the app switches screens, so they land straight on Today
      await saveProfile(a);
      clearSaved();
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== AUTH_QUERY_KEY[0] });
      setLocation("/today");
      qc.setQueryData(AUTH_QUERY_KEY, user);
      // Fetch the full account details (join date etc.) in the background
      void qc.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 409) setExists(true);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <Title sub="So your plan, meals and progress are saved on any phone.">Create your account</Title>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="q-email">Email</Label>
          <Input id="q-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl text-base" data-testid="input-email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="q-password">Password</Label>
          <Input id="q-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl text-base" data-testid="input-password" />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <div className="flex items-start gap-2.5">
          <Checkbox id="q-consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" data-testid="checkbox-consent" />
          <Label htmlFor="q-consent" className="text-sm font-normal leading-snug">
            I agree to the <Link href="/privacy" className="font-semibold text-primary hover:underline">privacy notice</Link>, including storing my body measurements and food logs to build my plan.
          </Label>
        </div>
        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert" data-testid="text-auth-error">
            {error}
            {exists && (
              <>
                {" "}
                <button type="button" className="font-semibold underline" onClick={onLogin}>Log in instead</button>
              </>
            )}
          </p>
        )}
        <Footer>
          <Button type="submit" className="h-14 w-full rounded-2xl text-base" disabled={busy} data-testid="button-create-account">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account and start
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">Your answers are kept on this phone until you do.</p>
        </Footer>
      </form>
    </div>
  );
}
