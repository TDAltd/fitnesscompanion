import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { CalendarDays, Flame, Footprints, Droplets, Beef, Loader2, RotateCcw, UserRoundPen, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePlan, useSaveTargetOverrides, useTargetOverrides } from "@/lib/plan";
import { PACES, type Pace, type Plan } from "@workspace/plan";
import { cn } from "@/lib/utils";

type FieldKey = "calorieTarget" | "proteinTarget" | "stepsGoal" | "waterGoalLitres";

const FIELDS: {
  key: FieldKey;
  targetKey: "calories" | "protein" | "steps" | "waterLitres";
  label: string;
  unit: string;
  step: string;
  icon: typeof Flame;
}[] = [
  { key: "calorieTarget", targetKey: "calories", label: "Calories", unit: "kcal / day", step: "25", icon: Flame },
  { key: "proteinTarget", targetKey: "protein", label: "Protein", unit: "g / day", step: "5", icon: Beef },
  { key: "stepsGoal", targetKey: "steps", label: "Steps", unit: "steps / day", step: "500", icon: Footprints },
  { key: "waterGoalLitres", targetKey: "waterLitres", label: "Water", unit: "litres / day", step: "0.25", icon: Droplets },
];

export default function MyPlanPage() {
  const { plan, isLoading } = usePlan();
  const { data: overrides } = useTargetOverrides();
  const save = useSaveTargetOverrides();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<FieldKey, string>>({
    calorieTarget: "",
    proteinTarget: "",
    stepsGoal: "",
    waterGoalLitres: "",
  });

  // Show saved overrides in the inputs; empty means "automatic"
  useEffect(() => {
    if (!overrides) return;
    setForm({
      calorieTarget: overrides.calorieTarget?.toString() ?? "",
      proteinTarget: overrides.proteinTarget?.toString() ?? "",
      stepsGoal: overrides.stepsGoal?.toString() ?? "",
      waterGoalLitres: overrides.waterGoalLitres?.toString() ?? "",
    });
  }, [overrides]);

  async function submit(values: Record<FieldKey, string>, message: string) {
    try {
      await save.mutateAsync({
        calorieTarget: values.calorieTarget ? Number(values.calorieTarget) : null,
        proteinTarget: values.proteinTarget ? Number(values.proteinTarget) : null,
        stepsGoal: values.stepsGoal ? Number(values.stepsGoal) : null,
        waterGoalLitres: values.waterGoalLitres ? Number(values.waterGoalLitres) : null,
      });
      toast({ title: message });
    } catch (err) {
      toast({
        title: "Couldn't save",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(form, "Targets saved");
  };

  const resetAll = () => {
    const empty = { calorieTarget: "", proteinTarget: "", stepsGoal: "", waterGoalLitres: "" };
    setForm(empty);
    void submit(empty, "Back to automatic targets");
  };

  if (isLoading || !plan) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const t = plan.targets;
  const anyOverride = Object.values(t.overridden).some(Boolean);

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      <PageHeader
        title="My plan"
        description="Built from your answers. Change them any time."
        action={
          <Button asChild variant="outline" className="gap-2" data-testid="link-edit-answers">
            <Link href="/onboarding">
              <UserRoundPen className="h-4 w-4" /> Update my answers
            </Link>
          </Button>
        }
      />

      {t.paceAvailable && <PaceCard plan={plan} />}

      {/* Weekly schedule */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm tracking-wide text-primary">
            <CalendarDays className="h-4 w-4" /> Your week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const day = plan.schedule[d];
              return (
                <div
                  key={d}
                  className={`rounded-lg border p-3 ${day.rest ? "border-border bg-card" : "border-primary/20 bg-background"}`}
                  data-testid={`schedule-day-${d}`}
                >
                  <p className={`text-xs font-bold ${day.rest ? "text-muted-foreground" : "text-primary"}`}>
                    {day.label.slice(0, 3)}
                  </p>
                  <p className="mt-1 text-sm font-bold leading-snug">{day.workout}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Exercises for each session are on the{" "}
            <Link href="/workout" className="font-semibold text-primary hover:underline">Workout</Link> page.
          </p>
        </CardContent>
      </Card>

      {/* Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Daily targets</CardTitle>
          <CardDescription>
            {t.maintenance
              ? <>Your body uses about <strong className="text-foreground">{t.maintenance.toLocaleString()} kcal</strong> a day. Leave a box empty to use the suggested value, or type your own (for example, one from your doctor or coach).</>
              : "Leave a box empty to use the suggested value, or type your own."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map(({ key, targetKey, label, unit, step, icon: Icon }) => (
                <div key={key} className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={key} className="flex items-center gap-2 font-bold">
                      <Icon className="h-4 w-4 text-primary" /> {label}
                    </Label>
                    {t.overridden[targetKey] ? (
                      <Badge variant="secondary" className="text-[10px]">Your value</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Suggested</Badge>
                    )}
                  </div>
                  <p className="text-2xl font-semibold" data-testid={`target-${targetKey}`}>
                    {t[targetKey].toLocaleString()} <span className="text-sm font-medium text-muted-foreground">{unit}</span>
                  </p>
                  <Input
                    id={key}
                    type="number"
                    inputMode="decimal"
                    step={step}
                    placeholder={`Suggested: ${t.auto[targetKey].toLocaleString()}`}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    data-testid={`input-${key}`}
                  />
                </div>
              ))}
            </div>

            {t.notes.length > 0 && (
              <div className="flex gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <div>{t.notes.map((n) => <p key={n}>{n}</p>)}</div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={save.isPending} data-testid="button-save-targets">
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save targets
              </Button>
              {anyOverride && (
                <Button type="button" variant="ghost" className="gap-2" onClick={resetAll} disabled={save.isPending}>
                  <RotateCcw className="h-4 w-4" /> Use suggested values
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Guidelines */}
      <div className="grid gap-4 md:grid-cols-2">
        {plan.guidelines.filter((g) => g.id !== "workout").map((g) => (
          <Card key={g.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base tracking-tight">{g.title}</CardTitle>
              <CardDescription className="text-xs">{g.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 rounded-b-xl border-t bg-muted/20 pt-3">
              <ul className="space-y-2">
                {g.details.map((d) => (
                  <li key={d} className="flex gap-2 text-sm">
                    <span className="shrink-0 font-bold text-primary">•</span>
                    <span className="font-medium">{d}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        These are general estimates, not medical advice. If you're pregnant, managing a health condition, or under 18,
        check targets with a doctor or dietitian.
      </p>
    </div>
  );
}

/** Pick how fast to lose weight. This is the only place the calorie target is decided. */
function PaceCard({ plan }: { plan: Plan }) {
  const t = plan.targets;
  const save = useSaveTargetOverrides();
  const { toast } = useToast();
  const choose = async (pace: Pace) => {
    try {
      // Choosing a pace replaces a hand-typed calorie target
      await save.mutateAsync({ pace, calorieTarget: null });
      toast({ title: `${PACES[pace].label} pace`, description: "Your calorie target is updated everywhere." });
    } catch (err) {
      toast({ title: "Couldn't save", description: (err as Error).message, variant: "destructive" });
    }
  };
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">How fast do you want to lose weight?</CardTitle>
        <CardDescription>
          {t.maintenance
            ? `You burn about ${t.maintenance.toLocaleString()} kcal a day. Pick a pace and your daily target follows.`
            : "Pick a pace and your daily target follows."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Weight-loss pace">
          {(Object.keys(PACES) as Pace[]).map((p) => {
            const on = t.pace === p && !t.overridden.calories;
            const kcal = t.maintenance ? Math.max(t.maintenance - PACES[p].deficit, 0) : null;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={save.isPending}
                onClick={() => void choose(p)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors",
                  on ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/60",
                )}
                data-testid={`pace-${p}`}
              >
                <p className="font-semibold">{PACES[p].label}</p>
                <p className="text-xs text-muted-foreground">{PACES[p].perWeek}</p>
                {kcal != null && <p className="mt-1 text-sm tabular-nums">≈ {(Math.round(kcal / 25) * 25).toLocaleString()} kcal</p>}
              </button>
            );
          })}
        </div>
        {!t.pace && !t.overridden.calories && (
          <p className="text-xs text-muted-foreground">Right now the app picks a pace for you ({t.calories.toLocaleString()} kcal a day).</p>
        )}
        {t.overridden.calories && (
          <p className="text-xs text-muted-foreground">You've typed your own calorie target below. Picking a pace replaces it.</p>
        )}
        <p className="text-xs text-muted-foreground">The app never suggests going under its safe minimum, so a faster pace may land on the same number.</p>
      </CardContent>
    </Card>
  );
}
