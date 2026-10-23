import { useState } from "react";
import { Link } from "wouter";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { Activity, ArrowRight, Calculator, HeartPulse, RefreshCw, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DEFICITS = [250, 350, 500] as const;
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  Sedentary: 1.2,
  "Lightly Active": 1.375,
  "Moderately Active": 1.55,
  "Very Active": 1.725,
};

const formatNumber = (value: number) => Math.round(value).toLocaleString();

export default function CalorieCalculatorPage() {
  const [deficit, setDeficit] = useState<number>(350);
  const { data: profile, isLoading, isError, refetch } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });

  const requiredValues = [
    profile?.ageYears,
    profile?.sex,
    profile?.heightCm,
    profile?.currentWeightKg,
    profile?.activityLevel,
  ];
  const hasProfile = requiredValues.every((value) => value !== null && value !== undefined && value !== "");
  const age = profile?.ageYears;
  const isUnder18 = typeof age === "number" && age < 18;

  const multiplier = profile?.activityLevel
    ? ACTIVITY_MULTIPLIERS[profile.activityLevel]
    : undefined;
  const sexAdjustment =
    profile?.sex === "Male" ? 5 :
    profile?.sex === "Female" ? -161 :
    profile?.sex === "Prefer not to say" ? -78 :
    undefined;
  const hasValidNumbers =
    typeof age === "number" && age > 0 &&
    typeof profile?.heightCm === "number" && profile.heightCm > 0 &&
    typeof profile?.currentWeightKg === "number" && profile.currentWeightKg > 0 &&
    typeof multiplier === "number" &&
    typeof sexAdjustment === "number";
  const bmr = hasValidNumbers
    ? 10 * profile.currentWeightKg! + 6.25 * profile.heightCm! - 5 * age! + sexAdjustment!
    : undefined;
  const maintenance = bmr !== undefined && multiplier !== undefined ? bmr * multiplier : undefined;
  const target = maintenance !== undefined ? maintenance - deficit : undefined;
  const targetIsPositive = target !== undefined && target > 0;
  const weeklyChange = deficit * 7 / 7700;

  return (
    <div className="space-y-7 pb-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <header className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card px-6 py-7 md:px-9 md:py-9">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border-[28px] border-primary/5" aria-hidden="true" />
        <div className="absolute right-10 top-8 hidden h-28 w-28 items-center justify-center rounded-full bg-primary/10 md:flex" aria-hidden="true">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-background text-primary">
            <Activity className="h-9 w-9" strokeWidth={1.5} />
          </div>
        </div>
        <div className="relative max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3 w-3" /> A steady starting point
          </div>
          <h1 className="text-3xl font-black uppercase leading-[0.95] tracking-tight md:text-5xl">Calorie<br className="sm:hidden" /> calculator</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            A practical estimate to support your training, meals, and everyday life. Choose a gentle pace that feels sustainable.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="h-72 animate-pulse rounded-xl border bg-muted/50" />
          <div className="h-72 animate-pulse rounded-xl border bg-muted/50" />
        </div>
      ) : isError ? (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <RefreshCw className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-bold">We couldn’t load your profile</p>
              <p className="mt-1 text-sm text-muted-foreground">Try again to see your personal estimate.</p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>Try again</Button>
          </CardContent>
        </Card>
      ) : !hasProfile || !hasValidNumbers ? (
        <Card className="overflow-hidden">
          <div className="h-1.5 bg-primary" />
          <CardContent className="flex flex-col items-start gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-black">Let’s complete your profile first</h2>
                <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  Add your age, sex, height, current weight, and activity level in Stats. We’ll use those saved details to make an estimate.
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0 gap-2">
              <Link href="/stats">Complete profile <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      ) : isUnder18 ? (
        <Card className="overflow-hidden border-primary/25">
          <div className="h-1.5 bg-primary" />
          <CardContent className="flex gap-4 p-6 md:p-8">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black">Your wellbeing comes first</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Because you’re under 18, we don’t calculate a weight-loss calorie target here. Your body is still growing and has changing needs. Please talk with a trusted adult and a clinician or registered dietitian about nutrition and activity that support you.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[0.84fr_1.16fr]">
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Choose your pace</CardTitle>
                  <CardDescription className="mt-0.5">Your estimate updates as you choose.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5 md:p-6">
              {profile?.fitnessGoal && profile.fitnessGoal !== "Weight loss" && (
                <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    Your focus: {profile.fitnessGoal}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
                    A calorie deficit is not required for every fitness goal. Use this estimate only if weight loss is also one of your aims.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Daily calorie deficit">
                {DEFICITS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDeficit(option)}
                    aria-pressed={deficit === option}
                    className={`rounded-xl border px-2 py-4 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      deficit === option
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    <span className="block text-xl font-black tabular-nums">{option}</span>
                    <span className={`mt-1 block text-[10px] font-bold uppercase tracking-wider ${deficit === option ? "text-primary-foreground/80" : "text-muted-foreground"}`}>kcal / day</span>
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Keep it flexible</p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
                  These are options, not rules. Energy needs shift day to day, and you can choose a smaller deficit or focus on maintenance whenever that feels right.
                </p>
              </div>
              <div className="flex items-start gap-3 border-t pt-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Estimates only, not medical advice. If you’re pregnant, managing a medical condition, or have a history of disordered eating, speak with a clinician or dietitian before changing your intake.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="overflow-hidden border-primary/30">
              <div className="flex items-center justify-between gap-4 bg-primary px-5 py-4 text-primary-foreground md:px-7">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/75">Estimated daily target</p>
                  <p className="mt-1 text-4xl font-black tabular-nums md:text-5xl">
                    {targetIsPositive ? formatNumber(target) : "Review"}
                    {targetIsPositive && <span className="text-base font-bold"> kcal</span>}
                  </p>
                  {!targetIsPositive && <p className="mt-1 text-xs text-primary-foreground/85">This estimate needs individual guidance.</p>}
                </div>
                <div className="hidden h-14 w-14 items-center justify-center rounded-full border border-primary-foreground/25 bg-primary-foreground/10 sm:flex">
                  <Activity className="h-7 w-7" />
                </div>
              </div>
              <CardContent className="grid grid-cols-2 divide-x p-0">
                <div className="p-5 md:p-6">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resting estimate</p>
                  <p className="mt-2 text-2xl font-black tabular-nums">{formatNumber(bmr ?? 0)} <span className="text-xs font-bold text-muted-foreground">kcal</span></p>
                  <p className="mt-1 text-xs text-muted-foreground">BMR · energy at rest</p>
                </div>
                <div className="p-5 md:p-6">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Daily maintenance</p>
                  <p className="mt-2 text-2xl font-black tabular-nums">{formatNumber(maintenance ?? 0)} <span className="text-xs font-bold text-muted-foreground">kcal</span></p>
                  <p className="mt-1 text-xs text-muted-foreground">Estimated total daily energy</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Selected daily deficit</p>
                  <p className="mt-1 text-2xl font-black tabular-nums">−{deficit} <span className="text-sm font-bold text-muted-foreground">kcal / day</span></p>
                </div>
                <div className="rounded-xl bg-muted/60 px-4 py-3 sm:min-w-48 sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Approx. weekly pace</p>
                  <p className="mt-1 text-lg font-black tabular-nums">−{weeklyChange.toFixed(2)} <span className="text-xs font-bold text-muted-foreground">kg / week</span></p>
                </div>
              </CardContent>
            </Card>

            <p className="px-1 text-xs leading-relaxed text-muted-foreground">
              Calculated with Mifflin–St Jeor and your saved activity level. Actual energy needs and weight trends vary; this is a starting estimate, not a promise or a required daily number.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
