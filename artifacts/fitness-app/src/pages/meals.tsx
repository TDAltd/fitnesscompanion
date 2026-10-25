import { useMemo, useState } from "react";
import { addDays, format, isToday, isYesterday, parseISO } from "date-fns";
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Clock, Plus, Search, Trash2 } from "lucide-react";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AddFoodSheet } from "@/components/eat/add-food-sheet";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/lib/plan";
import { RECIPES, matchesDietaryPreference, type Cuisine, type Recipe } from "@/lib/recipes";
import { SLOTS, formatServings, useAddFood, useFoodLog, useRemoveFood, type FoodEntry, type Slot } from "@/lib/food-log";
import { cn } from "@/lib/utils";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

function defaultSlot(): Slot {
  const h = new Date().getHours();
  if (h < 11) return "Breakfast";
  if (h < 16) return "Lunch";
  if (h < 21) return "Dinner";
  return "Snack";
}

export default function Meals() {
  const [view, setView] = useState<"diary" | "recipes">("diary");
  const [date, setDate] = useState(() => iso(new Date()));
  const [sheet, setSheet] = useState<{ open: boolean; slot: Slot }>({ open: false, slot: defaultSlot() });
  const openAdd = (slot: Slot) => setSheet({ open: true, slot });

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      <PageHeader
        title="Eat"
        description={view === "diary" ? "Log what you eat. Everything here counts towards today." : "Ideas that fit your plan. Add one to your diary in a tap."}
      />
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="tablist">
        {(["diary", "recipes"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn(
              "rounded-full py-2 text-sm font-semibold transition-colors",
              view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
            data-testid={`tab-${v}`}
          >
            {v === "diary" ? "Food diary" : "Recipe ideas"}
          </button>
        ))}
      </div>

      {view === "diary" ? <Diary date={date} setDate={setDate} onAdd={openAdd} /> : <Recipes date={date} />}


      <AddFoodSheet open={sheet.open} onOpenChange={(open) => setSheet((s) => ({ ...s, open }))} date={date} slot={sheet.slot} />
    </div>
  );
}

function Diary({ date, setDate, onAdd }: { date: string; setDate: (d: string) => void; onAdd: (s: Slot) => void }) {
  const { data: entries, isLoading } = useFoodLog(date);
  const { plan } = usePlan();
  const remove = useRemoveFood();
  const [showMacros, setShowMacros] = useState(false);

  const d = parseISO(date);
  const label = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "EEE d MMM");
  const atToday = isToday(d);

  const totals = useMemo(
    () =>
      (entries ?? []).reduce(
        (t, e) => ({ calories: t.calories + e.calories, protein: t.protein + e.protein, carbs: t.carbs + e.carbs, fat: t.fat + e.fat }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [entries],
  );
  const target = plan?.targets.calories ?? 0;
  const proteinTarget = plan?.targets.protein ?? 0;
  const left = target - totals.calories;

  return (
    <div className="space-y-4">
      {/* Date */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="Previous day" onClick={() => setDate(iso(addDays(d, -1)))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <button className="font-display text-lg font-medium" onClick={() => setDate(iso(new Date()))} title="Back to today">
          {label}
        </button>
        <Button variant="ghost" size="icon" aria-label="Next day" disabled={atToday} onClick={() => setDate(iso(addDays(d, 1)))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* The one number that matters */}
      <Card>
        <CardContent className="flex items-center gap-5 p-5">
          <CalorieRing eaten={totals.calories} target={target} />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="font-display text-3xl font-medium tabular-nums" data-testid="text-calories-left">
                {target ? Math.abs(left).toLocaleString() : totals.calories.toLocaleString()}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  {target ? (left >= 0 ? "kcal left" : "kcal over") : "kcal eaten"}
                </span>
              </p>
              {target > 0 && (
                <p className="text-sm text-muted-foreground">
                  {totals.calories.toLocaleString()} eaten of {target.toLocaleString()}
                </p>
              )}
            </div>
            {proteinTarget > 0 && (
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">Protein</span>
                  <span className="tabular-nums text-muted-foreground">
                    {totals.protein} / {proteinTarget} g
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-[hsl(var(--dusk))]" style={{ width: `${Math.min(100, (totals.protein / proteinTarget) * 100)}%` }} />
                </div>
              </div>
            )}
            <button className="text-xs font-semibold text-primary" onClick={() => setShowMacros((s) => !s)}>
              {showMacros ? "Hide carbs & fat" : "Show carbs & fat"}
            </button>
            {showMacros && (
              <p className="text-sm text-muted-foreground tabular-nums">
                Carbs {totals.carbs} g · Fat {totals.fat} g
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Meal slots */}
      {isLoading ? (
        <div className="space-y-3">
          {SLOTS.map((s) => (
            <Skeleton key={s.slot} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        SLOTS.map(({ slot, label: slotLabel }) => {
          const items = (entries ?? []).filter((e) => e.slot === slot);
          const kcal = items.reduce((t, e) => t + e.calories, 0);
          return (
            <Card key={slot} data-testid={`slot-${slot}`}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <h2 className="font-display text-base font-medium">{slotLabel}</h2>
                    {kcal > 0 && <p className="text-xs tabular-nums text-muted-foreground">{kcal.toLocaleString()} kcal</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => onAdd(slot)} data-testid={`button-add-${slot}`}>
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
                {items.length > 0 && (
                  <ul className="divide-y border-t">
                    {items.map((e) => (
                      <EntryRow key={e.id} entry={e} onRemove={() => remove.mutate(e.id)} />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

function EntryRow({ entry, onRemove }: { entry: FoodEntry; onRemove: () => void }) {
  return (
    <li className="group flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{entry.name}</p>
        <p className="text-xs text-muted-foreground">
          {entry.servings !== 1 && `${formatServings(entry.servings)} portions · `}
          {entry.protein} g protein
        </p>
      </div>
      <span className="text-sm tabular-nums">{entry.calories}</span>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Remove ${entry.name}`} onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

function CalorieRing({ eaten, target }: { eaten: number; target: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = target ? Math.min(1, eaten / target) : 0;
  const over = target > 0 && eaten > target + 50;
  return (
    <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0 -rotate-90" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-muted" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        className={cn("transition-all duration-500", over ? "stroke-amber-500" : "stroke-primary")}
      />
    </svg>
  );
}

const SLOT_OF: Record<string, Slot> = { Breakfast: "Breakfast", Lunch: "Lunch", Dinner: "Dinner" };

function Recipes({ date }: { date: string }) {
  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const [q, setQ] = useState("");
  const [cuisine, setCuisine] = useState<Cuisine>("Any");
  const [meal, setMeal] = useState<"All" | "Breakfast" | "Lunch" | "Dinner" | "Snack">("All");
  const [open, setOpen] = useState<number | null>(null);
  const add = useAddFood();
  const { toast } = useToast();
  const diet = profile?.dietaryPreference;

  const list = useMemo(
    () =>
      RECIPES.filter((r) => matchesDietaryPreference(r, diet))
        .filter((r) => cuisine === "Any" || r.cuisine === cuisine || r.cuisine === "Any")
        .filter((r) => meal === "All" || (SLOT_OF[r.category] ?? "Snack") === meal)
        .filter((r) => !q.trim() || `${r.name} ${r.ingredients.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())),
    [diet, cuisine, meal, q],
  );

  const addRecipe = (r: Recipe) => {
    const slot = SLOT_OF[r.category] ?? "Snack";
    add.mutate(
      { date, slot, name: r.name, servings: 1, calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat, source: "recipe" },
      {
        onSuccess: () => toast({ title: `Added to ${slot === "Snack" ? "snacks" : slot.toLowerCase()}`, description: r.name }),
        onError: (e) => toast({ title: "Couldn't add that", description: (e as Error).message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipes or ingredients" className="h-11 pl-9 text-base" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["All", "Breakfast", "Lunch", "Dinner", "Snack"] as const).map((m) => (
          <Chip key={m} on={meal === m} onClick={() => setMeal(m)}>{m === "Snack" ? "Snacks" : m}</Chip>
        ))}
        <span className="mx-1 w-px bg-border" />
        {(["Any", "Nigerian", "International"] as const).map((c) => (
          <Chip key={c} on={cuisine === c} onClick={() => setCuisine(c)}>{c === "Any" ? "All cuisines" : c}</Chip>
        ))}
      </div>
      {diet && diet !== "No preference" && <p className="text-xs text-muted-foreground">Showing {diet.toLowerCase()} options, from your profile.</p>}

      {list.length === 0 ? (
        <p className="rounded-xl bg-muted/50 p-4 text-sm">No recipes match. Try another search or filter.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => (
            <li key={r.id}>
              <Card>
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 p-4">
                    <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>
                      <p className="font-semibold">{r.name}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="tabular-nums">{r.calories} kcal · {r.protein} g protein</span>
                        {r.prepMins ? (<span className="flex items-center gap-1"><Clock className="h-3 w-3" />{r.prepMins} min</span>) : null}
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open === r.id && "rotate-180")} />
                      </p>
                    </button>
                    <Button size="sm" variant="outline" className="shrink-0" disabled={add.isPending} onClick={() => addRecipe(r)} data-testid="button-add-recipe">
                      <Plus className="mr-1 h-4 w-4" /> Add
                    </Button>
                  </div>
                  {open === r.id && (
                    <div className="grid gap-4 border-t p-4 text-sm sm:grid-cols-2">
                      <div>
                        <h3 className="mb-1.5 font-semibold">Ingredients</h3>
                        <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">{r.ingredients.map((i) => <li key={i}>{i}</li>)}</ul>
                      </div>
                      <div>
                        <h3 className="mb-1.5 flex items-center gap-1.5 font-semibold"><BookOpen className="h-3.5 w-3.5" /> Method</h3>
                        <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">{r.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn("rounded-full px-3 py-1 text-xs font-semibold transition-colors", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}
    >
      {children}
    </button>
  );
}
