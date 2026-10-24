import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Dumbbell,
  Leaf,
  LoaderCircle,
  RotateCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  getGetProfileQueryKey,
  useGetProfile,
  useUpsertProfile,
  type UserProfileInput,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const numericInput = (label: string, min: number, max: number, integer = false) =>
  z.string()
    .trim()
    .min(1, `${label} is needed to personalize your plan.`)
    .refine((value) => Number.isFinite(Number(value)), `${label} must be a number.`)
    .refine((value) => Number(value) >= min && Number(value) <= max, `${label} should be between ${min} and ${max}.`)
    .refine((value) => !integer || Number.isInteger(Number(value)), `${label} must be a whole number.`);

const optionalNumericInput = (label: string, min: number, max: number) =>
  z.string()
    .trim()
    .refine((value) => value === "" || Number.isFinite(Number(value)), `${label} must be a number.`)
    .refine((value) => value === "" || (Number(value) >= min && Number(value) <= max), `${label} should be between ${min} and ${max}.`);

const optionalTextInput = (label: string, max: number) =>
  z.string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`);

const requiredSelect = <T extends readonly [string, ...string[]]>(choices: T, message: string) =>
  z.enum(choices).optional().refine((value): value is T[number] => value !== undefined, message);

const FITNESS_GOALS = ["Weight loss", "Build strength", "Improve endurance", "General fitness"] as const;
const DIETARY_PREFERENCES = ["No preference", "Vegetarian", "Vegan", "Pescatarian", "High-protein"] as const;
const WORKOUT_LOCATIONS = ["Home", "Gym", "Outdoors", "Mixed"] as const;
const TRAINING_EXPERIENCES = ["Beginner", "Intermediate", "Advanced"] as const;
const WORKOUT_TIME_PREFERENCES = ["Morning", "Midday", "Evening", "Flexible"] as const;
const WORKOUT_DURATIONS = ["15", "30", "45", "60"] as const;
type WorkoutDurationMinutes = 15 | 30 | 45 | 60;

const profileSchema = z.object({
  name: z.string().trim().min(2, "Add at least 2 characters for your name.").max(60, "Keep your name under 60 characters."),
  ageYears: numericInput("Age", 10, 110, true),
  sex: requiredSelect(["Female", "Male", "Prefer not to say"], "Choose an option to continue."),
  heightCm: numericInput("Height", 100, 250),
  currentWeightKg: numericInput("Current weight", 30, 350),
  goalWeightKg: numericInput("Goal weight", 30, 350),
  activityLevel: requiredSelect(["Sedentary", "Lightly Active", "Moderately Active", "Very Active"], "Choose your usual activity level."),
  fitnessGoal: requiredSelect(FITNESS_GOALS, "Choose a direction for your plan."),
  dietaryPreference: requiredSelect(DIETARY_PREFERENCES, "Choose the food approach that suits you."),
  guiltyPleasure: z.string().trim().max(80, "Keep this under 80 characters.").optional(),
  sleepHoursPerNight: optionalNumericInput("Sleep hours", 0, 16),
  mealSchedule: optionalTextInput("Meal timing", 160),
  waterIntakeLiters: optionalNumericInput("Daily water intake", 0, 15),
  dailySchedule: optionalTextInput("Typical day", 180),
  workoutTimePreference: z.enum(WORKOUT_TIME_PREFERENCES).optional(),
  workoutDurationMinutes: z.enum(WORKOUT_DURATIONS).optional(),
  workoutDaysPerWeek: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).optional().refine((value): value is 2 | 3 | 4 | 5 | 6 => value !== undefined, "Choose a number of days."),
  workoutLocation: requiredSelect(WORKOUT_LOCATIONS, "Choose where you'd like to train."),
  trainingExperience: requiredSelect(TRAINING_EXPERIENCES, "Choose the best fit for you."),
});

type ProfileFormInput = z.input<typeof profileSchema>;
type ProfileFormValues = z.output<typeof profileSchema>;

const EMPTY_PROFILE: ProfileFormInput = {
  name: "",
  ageYears: "",
  sex: undefined,
  heightCm: "",
  currentWeightKg: "",
  goalWeightKg: "",
  activityLevel: undefined,
  fitnessGoal: undefined,
  dietaryPreference: undefined,
  guiltyPleasure: "",
  sleepHoursPerNight: "",
  mealSchedule: "",
  waterIntakeLiters: "",
  dailySchedule: "",
  workoutTimePreference: undefined,
  workoutDurationMinutes: undefined,
  workoutDaysPerWeek: undefined,
  workoutLocation: undefined,
  trainingExperience: undefined,
};

const OPTIONAL_PROFILE_FIELDS = new Set([
  "guiltyPleasure",
  "sleepHoursPerNight",
  "mealSchedule",
  "waterIntakeLiters",
  "dailySchedule",
  "workoutTimePreference",
  "workoutDurationMinutes",
]);

const SELECT_TEST_IDS = {
  sex: "select-sex",
  activityLevel: "select-activity-level",
  fitnessGoal: "select-fitness-goal",
  dietaryPreference: "select-dietary-preference",
  workoutDaysPerWeek: "select-workout-days",
  workoutLocation: "select-workout-location",
  trainingExperience: "select-training-experience",
};

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isError, refetch } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });
  const upsertProfile = useUpsertProfile();
  const [saved, setSaved] = useState(false);

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: EMPTY_PROFILE,
    mode: "onTouched",
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({
      name: profile.name ?? "",
      ageYears: profile.ageYears == null ? "" : String(profile.ageYears),
      sex: (profile.sex as ProfileFormInput["sex"]) ?? undefined,
      heightCm: profile.heightCm == null ? "" : String(profile.heightCm),
      currentWeightKg: profile.currentWeightKg == null ? "" : String(profile.currentWeightKg),
      goalWeightKg: profile.goalWeightKg == null ? "" : String(profile.goalWeightKg),
      activityLevel: (profile.activityLevel as ProfileFormInput["activityLevel"]) ?? undefined,
      fitnessGoal: (profile.fitnessGoal as ProfileFormInput["fitnessGoal"]) ?? undefined,
      dietaryPreference: (profile.dietaryPreference as ProfileFormInput["dietaryPreference"]) ?? undefined,
      guiltyPleasure: profile.guiltyPleasure ?? "",
      sleepHoursPerNight: profile.sleepHoursPerNight == null ? "" : String(profile.sleepHoursPerNight),
      mealSchedule: profile.mealSchedule ?? "",
      waterIntakeLiters: profile.waterIntakeLiters == null ? "" : String(profile.waterIntakeLiters),
      dailySchedule: profile.dailySchedule ?? "",
      workoutTimePreference: (profile.workoutTimePreference as ProfileFormInput["workoutTimePreference"]) ?? undefined,
      workoutDurationMinutes: profile.workoutDurationMinutes == null
        ? undefined
        : String(profile.workoutDurationMinutes) as ProfileFormInput["workoutDurationMinutes"],
      workoutDaysPerWeek: profile.workoutDaysPerWeek as ProfileFormInput["workoutDaysPerWeek"],
      workoutLocation: (profile.workoutLocation as ProfileFormInput["workoutLocation"]) ?? undefined,
      trainingExperience: (profile.trainingExperience as ProfileFormInput["trainingExperience"]) ?? undefined,
    });
  }, [profile, form]);

  const watchedValues = form.watch();
  const completedCount = Object.entries(watchedValues)
    .filter(([key, value]) => !OPTIONAL_PROFILE_FIELDS.has(key) && value !== "" && value !== undefined)
    .length;

  function onSubmit(values: ProfileFormValues) {
    setSaved(false);
    const data: UserProfileInput = {
      name: values.name,
      ageYears: Number(values.ageYears),
      heightCm: Number(values.heightCm),
      currentWeightKg: Number(values.currentWeightKg),
      goalWeightKg: Number(values.goalWeightKg),
      sex: values.sex,
      activityLevel: values.activityLevel,
      fitnessGoal: values.fitnessGoal,
      dietaryPreference: values.dietaryPreference,
      guiltyPleasure: values.guiltyPleasure?.trim() || null,
      sleepHoursPerNight: values.sleepHoursPerNight.trim() ? Number(values.sleepHoursPerNight) : null,
      mealSchedule: values.mealSchedule.trim() || null,
      waterIntakeLiters: values.waterIntakeLiters.trim() ? Number(values.waterIntakeLiters) : null,
      dailySchedule: values.dailySchedule.trim() || null,
      workoutTimePreference: values.workoutTimePreference ?? null,
      workoutDurationMinutes: values.workoutDurationMinutes
        ? Number(values.workoutDurationMinutes) as WorkoutDurationMinutes
        : null,
      workoutDaysPerWeek: values.workoutDaysPerWeek,
      workoutLocation: values.workoutLocation,
      trainingExperience: values.trainingExperience,
    };
    upsertProfile.mutate({ data }, {
      onSuccess: (savedProfile) => {
        queryClient.setQueryData(getGetProfileQueryKey(), savedProfile);
        void queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        setSaved(true);
        window.setTimeout(() => setLocation("/dashboard"), 900);
      },
    });
  }

  if (isLoading) {
    return (
      <main className="onboarding-page min-h-[100dvh] px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl animate-pulse">
          <div className="mb-10 h-4 w-32 rounded bg-muted" />
          <div className="mb-4 h-10 w-3/4 rounded bg-muted" />
          <div className="mb-10 h-5 w-1/2 rounded bg-muted" />
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div className="space-y-5">
              {[0, 1, 2].map((item) => <div key={item} className="h-64 rounded-2xl border bg-card/70" />)}
            </div>
            <div className="h-72 rounded-2xl border bg-card/70" />
          </div>
          <p className="sr-only" role="status" data-testid="status-loading-profile">Loading your saved profile…</p>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="onboarding-page flex min-h-[100dvh] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-lg border-destructive/20 bg-card/95 shadow-xl shadow-foreground/5">
          <CardContent className="flex flex-col items-center px-7 py-10 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <CircleAlert className="h-7 w-7" />
            </div>
            <p className="mb-2 text-xs text-muted-foreground">One small pause</p>
            <h1 className="text-2xl font-bold">We couldn’t load your profile.</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Your answers are still here when the connection is ready. Try again in a moment.</p>
            <Button className="mt-7 gap-2" onClick={() => void refetch()} data-testid="button-retry-profile">
              <RotateCw className="h-4 w-4" /> Try again
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="onboarding-page min-h-[100dvh] px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-9 flex items-center justify-between">
          <Logo showTagline />
          <div className="hidden items-center gap-2 rounded-full border border-border/80 bg-card/75 px-3 py-2 text-xs font-medium text-muted-foreground sm:flex">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> A few details, then we get moving
          </div>
          <Link
            href="/account"
            className="text-xs font-semibold text-primary hover:underline"
            data-testid="link-import-instead"
          >
            Have data from the old app? Import it
          </Link>
        </div>

        <div className="mb-8 max-w-2xl">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-bold text-primary">
            <span className="h-px w-7 bg-primary" /> A plan that fits real life
          </div>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-5xl">
            Let’s make this feel doable
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Tell us what you’re working toward and what your week really looks like. We’ll use it to shape a routine you can come back to.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3" aria-label="Onboarding progress">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.round((completedCount / 12) * 100)}%` }} />
          </div>
          <span className="text-xs font-bold text-muted-foreground" data-testid="text-profile-progress">{completedCount}/12</span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
              <div className="space-y-5">
                <Card className="overflow-hidden border-border/80 bg-card/90 shadow-sm shadow-foreground/[0.025]">
                  <div className="flex items-start gap-4 border-b border-border/70 px-5 py-5 sm:px-7">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-primary">01 / The basics</p>
                      <h2 className="mt-1 text-xl font-bold">A little about you</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Just enough context to make your starting point useful.</p>
                    </div>
                  </div>
                  <CardContent className="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2 sm:p-7">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Your name</FormLabel>
                        <FormControl><Input autoComplete="name" placeholder="What should we call you?" {...field} data-testid="input-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="ageYears" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl><Input type="number" min="10" max="110" inputMode="numeric" placeholder="Years" {...field} data-testid="input-age" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="sex" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sex</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl><SelectTrigger data-testid={SELECT_TEST_IDS.sex}><SelectValue placeholder="Choose an option" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="heightCm" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height <span className="font-normal text-muted-foreground">(cm)</span></FormLabel>
                        <FormControl><Input type="number" min="100" max="250" step="0.1" inputMode="decimal" placeholder="e.g. 170" {...field} data-testid="input-height-cm" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="currentWeightKg" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current <span className="font-normal text-muted-foreground">(kg)</span></FormLabel>
                          <FormControl><Input type="number" min="30" max="350" step="0.1" inputMode="decimal" placeholder="e.g. 72" {...field} data-testid="input-current-weight" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="goalWeightKg" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Goal <span className="font-normal text-muted-foreground">(kg)</span></FormLabel>
                          <FormControl><Input type="number" min="30" max="350" step="0.1" inputMode="decimal" placeholder="e.g. 68" {...field} data-testid="input-goal-weight" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="activityLevel" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Your usual activity outside workouts</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl><SelectTrigger data-testid={SELECT_TEST_IDS.activityLevel}><SelectValue placeholder="Choose what sounds closest" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Sedentary">Mostly sitting</SelectItem>
                            <SelectItem value="Lightly Active">A little movement most days</SelectItem>
                            <SelectItem value="Moderately Active">On my feet or moving regularly</SelectItem>
                            <SelectItem value="Very Active">A physically active day-to-day</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-border/80 bg-card/90 shadow-sm shadow-foreground/[0.025]">
                  <div className="flex items-start gap-4 border-b border-border/70 px-5 py-5 sm:px-7">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Leaf className="h-5 w-5" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-primary">02 / What matters</p>
                      <h2 className="mt-1 text-xl font-bold">Your direction and food style</h2>
                      <p className="mt-1 text-sm text-muted-foreground">There’s no perfect answer. Pick the one that feels most like you right now.</p>
                    </div>
                  </div>
                  <CardContent className="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2 sm:p-7">
                    <FormField control={form.control} name="fitnessGoal" render={({ field }) => (
                      <FormItem>
                        <FormLabel>What would you like to focus on?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl><SelectTrigger data-testid={SELECT_TEST_IDS.fitnessGoal}><SelectValue placeholder="Choose a goal" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Weight loss">Weight loss</SelectItem>
                            <SelectItem value="Build strength">Build strength</SelectItem>
                            <SelectItem value="Improve endurance">Improve endurance</SelectItem>
                            <SelectItem value="General fitness">General fitness</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="dietaryPreference" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Food preference</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl><SelectTrigger data-testid={SELECT_TEST_IDS.dietaryPreference}><SelectValue placeholder="Choose what suits you" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="No preference">No preference</SelectItem>
                            <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                            <SelectItem value="Vegan">Vegan</SelectItem>
                            <SelectItem value="Pescatarian">Pescatarian</SelectItem>
                            <SelectItem value="High-protein">High-protein</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="guiltyPleasure" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>What’s your guilty pleasure?</FormLabel>
                        <FormControl>
                          <Input
                            maxLength={80}
                            placeholder="e.g., biscuits"
                            autoComplete="off"
                            {...field}
                            data-testid="input-guilty-pleasure"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          No judgment—this helps us understand the snacks you enjoy.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-border/80 bg-card/90 shadow-sm shadow-foreground/[0.025]">
                  <div className="flex items-start gap-4 border-b border-border/70 px-5 py-5 sm:px-7">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Clock3 className="h-5 w-5" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-primary">03 / Your routine</p>
                      <h2 className="mt-1 text-xl font-bold">Make the plan fit your day</h2>
                      <p className="mt-1 text-sm text-muted-foreground">These are optional—rough estimates are fine, and you can leave anything blank.</p>
                    </div>
                  </div>
                  <CardContent className="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2 sm:p-7">
                    <FormField control={form.control} name="sleepHoursPerNight" render={({ field }) => (
                      <FormItem>
                        <FormLabel>About how many hours do you sleep each night?</FormLabel>
                        <FormControl><Input type="number" min="0" max="16" step="0.5" inputMode="decimal" placeholder="e.g. 7.5" {...field} data-testid="input-sleep-hours" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="waterIntakeLiters" render={({ field }) => (
                      <FormItem>
                        <FormLabel>About how much water do you drink each day?</FormLabel>
                        <FormControl><Input type="number" min="0" max="15" step="0.25" inputMode="decimal" placeholder="Litres, e.g. 2" {...field} data-testid="input-water-intake" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="mealSchedule" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>When do you usually eat?</FormLabel>
                        <FormControl><Input maxLength={160} placeholder="e.g. Breakfast around 8am, lunch at 1pm" {...field} data-testid="input-meal-schedule" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="dailySchedule" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>What does a typical day look like?</FormLabel>
                        <FormControl><Input maxLength={180} placeholder="e.g. Work 9–5, evenings usually free" {...field} data-testid="input-daily-schedule" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="workoutTimePreference" render={({ field }) => (
                      <FormItem>
                        <FormLabel>When can you usually fit in a workout?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl><SelectTrigger data-testid="select-workout-time"><SelectValue placeholder="Choose a time" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Morning">Morning</SelectItem>
                            <SelectItem value="Midday">Midday</SelectItem>
                            <SelectItem value="Evening">Evening</SelectItem>
                            <SelectItem value="Flexible">It varies</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="workoutDurationMinutes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>How long can you usually set aside?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl><SelectTrigger data-testid="select-workout-duration"><SelectValue placeholder="Choose a duration" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {WORKOUT_DURATIONS.map((duration) => (
                              <SelectItem key={duration} value={duration}>{duration} minutes</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-border/80 bg-card/90 shadow-sm shadow-foreground/[0.025]">
                  <div className="flex items-start gap-4 border-b border-border/70 px-5 py-5 sm:px-7">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Dumbbell className="h-5 w-5" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-primary">04 / Your real week</p>
                      <h2 className="mt-1 text-xl font-bold">Make room for movement</h2>
                      <p className="mt-1 text-sm text-muted-foreground">A steady rhythm beats an ambitious plan you can’t keep.</p>
                    </div>
                  </div>
                  <CardContent className="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2 sm:p-7">
                    <FormField control={form.control} name="workoutDaysPerWeek" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Days you’d like to train each week</FormLabel>
                        <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value == null ? "" : String(field.value)}>
                          <FormControl><SelectTrigger data-testid={SELECT_TEST_IDS.workoutDaysPerWeek}><SelectValue placeholder="Choose a rhythm" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {[2, 3, 4, 5, 6].map((days) => <SelectItem key={days} value={String(days)}>{days} days a week</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="workoutLocation" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Where do you prefer to work out?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl><SelectTrigger data-testid={SELECT_TEST_IDS.workoutLocation}><SelectValue placeholder="Choose a place" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Home">At home</SelectItem>
                            <SelectItem value="Gym">At a gym</SelectItem>
                            <SelectItem value="Outdoors">Outside</SelectItem>
                            <SelectItem value="Mixed">A mix of places</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="trainingExperience" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>How does training feel for you?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <FormControl><SelectTrigger data-testid={SELECT_TEST_IDS.trainingExperience}><SelectValue placeholder="Choose your starting point" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Beginner">I’m just getting started</SelectItem>
                            <SelectItem value="Intermediate">I have a routine I know</SelectItem>
                            <SelectItem value="Advanced">Training is already part of my week</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                {upsertProfile.isError && (
                  <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm" role="alert" data-testid="status-save-error">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <div>
                      <p className="font-semibold text-foreground">We couldn’t save your plan just yet.</p>
                      <p className="mt-1 text-muted-foreground">Your answers are still on this page. Check your connection and try saving again.</p>
                    </div>
                  </div>
                )}
                {saved && (
                  <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/[0.06] p-4 text-sm text-foreground dark:text-primary" role="status" data-testid="status-profile-saved">
                    <Check className="h-5 w-5" />
                    <span className="font-semibold">Saved. Your first step is already in motion.</span>
                  </div>
                )}
                <Button type="submit" size="lg" className="group h-14 w-full gap-3 rounded-xl text-base font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25" disabled={upsertProfile.isPending || saved} data-testid="button-save-profile">
                  {upsertProfile.isPending ? (
                    <><LoaderCircle className="h-5 w-5 animate-spin" /> Saving your plan…</>
                  ) : saved ? (
                    <><Check className="h-5 w-5" /> You’re all set</>
                  ) : (
                    <>Build my routine <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></>
                  )}
                </Button>
              </div>

              <aside className="space-y-4 lg:sticky lg:top-8">
                <div className="relative overflow-hidden rounded-2xl bg-secondary p-6 text-secondary-foreground shadow-lg shadow-secondary/10">
                  <div className="absolute -right-9 -top-10 h-36 w-36 rounded-full border border-primary/30" />
                  <div className="absolute -right-2 -top-3 h-24 w-24 rounded-full border border-primary/25" />
                  <div className="relative">
                    <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-secondary-foreground/15 bg-secondary-foreground/5 px-3 py-1.5 text-[10px] text-secondary-foreground/75">
                      <Sparkles className="h-3 w-3 text-primary" /> Keep it human
                    </div>
                    <p className="text-[10px] text-primary">A note from your coach</p>
                    <p className="mt-3 text-2xl font-bold leading-tight tracking-tight">Small steps still move you forward.</p>
                    <p className="mt-3 text-sm leading-6 text-secondary-foreground/65">
                      We’ll start with the time, space, and habits you actually have. You can adjust your plan whenever life changes.
                    </p>
                    <div className="mt-7 flex items-center gap-2 border-t border-secondary-foreground/10 pt-4 text-xs text-secondary-foreground/65">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      No perfect week required
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-card/80 p-5">
                  <p className="text-[10px] font-bold text-muted-foreground">Your setup</p>
                  <div className="mt-4 space-y-3">
                    {[
                      { label: "Starting point", done: Boolean(form.watch("name") && form.watch("ageYears") && form.watch("sex")) },
                      { label: "Your direction", done: Boolean(form.watch("fitnessGoal") && form.watch("dietaryPreference")) },
                      { label: "A weekly rhythm", done: Boolean(form.watch("workoutDaysPerWeek") && form.watch("workoutLocation") && form.watch("trainingExperience")) },
                    ].map((step) => (
                      <div key={step.label} className="flex items-center justify-between text-sm">
                        <span className={step.done ? "text-foreground" : "text-muted-foreground"}>{step.label}</span>
                        {step.done ? <Check className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/45" />}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="px-2 text-center text-xs leading-5 text-muted-foreground">
                  Your details help personalize your fitness and food routine. You can update them whenever your goals change.
                </p>
              </aside>
            </div>
          </form>
        </Form>
      </div>
    </main>
  );
}
