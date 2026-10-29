import { useMemo, useState } from "react";
import { addDays, format, isToday, isYesterday, parseISO } from "date-fns";
import { BookOpen, Cake, Pencil, ChevronDown, ChevronLeft, ChevronRight, Clock, Plus, Search, Trash2 } from "lucide-react";
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
import { SLOTS, formatServings, targetFor, useAddFood, useFoodLog, useRemoveFood, useSetTreat, useTreats, type FoodEntry, type Slot } from "@/lib/food-log";
import { LowIntakeNote, lowIntakeMessage } from "@/components/eat/low-intake-note";
import { MealIdeas } from "@/components/eat/meal-ideas";
import { EditFoodSheet } from "@/components/eat/edit-food-sheet";
import { dailyShuffle } from "@/lib/daily";
import { calorieFloor } from "@workspace/plan";
import { cn } from "@/lib/utils";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** The main meal for the time of day: breakfast until 11, lunch until 4 PM, dinner after that. */
function defaultSlot(): Slot {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return "Breakfast";
  if (h >= 11 && h < 16) return "Lunch";
  return "Dinner";
}

export default function Meals() {
  const [view, setView] = useState<"diary" | "recipes">("diary");
  const [date, setDate] = useState(() => iso(new Date()));
  // /eat?add=1 (from Today) opens the add sheet straight away, on the meal that fits the time of day
  const [sheet, setSheet] = useState<{ open: boolean; slot: Slot }>(() => {
    const open = new URLSearchParams(window.location.search).get("add") === "1";
    if (open) window.history.replaceState(null, "", window.location.pathname);
    return { open, slot: defaultSlot() };
  });
  const openAdd = (slot: Slot) => setSheet({ open: true, slot });

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title="Eat"
        description={view === "diary" ? "Log what you eat. Everything here counts towards today." : "Ideas that fit your plan. Add one to your diary in a tap."}
        action={
          <Button className="gap-1.5" onClick={() => openAdd(defaultSlot())} data-testid="button-add-food-header">
            <Plus className="h-4 w-4" /> Log a meal
          </Button>
        }
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
  const [editing, setEditing] = useState<FoodEntry | null>(null);

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
  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const { data: treats } = useTreats(iso(addDays(d, -7)), iso(addDays(d, 7)));
  const setTreat = useSetTreat();
  const { toast } = useToast();
  const habitFocus = Boolean(plan?.targets.habitFocus);
  const isTreat = Boolean(treats?.dates.includes(date));
  const target = plan ? targetFor(date, plan.targets.calories, treats) : 0;
  const proteinTarget = plan?.targets.protein ?? 0;
  const left = target - totals.calories;
  const slotsLogged = new Set((entries ?? []).map((e) => e.slot)).size;
  const lowNote = isLoading ? null : lowIntakeMessage({ calories: totals.calories, target, floor: calorieFloor(profile?.sex), isToday: atToday, habitFocus });
  const toggleTreat = () =>
    setTreat.mutate(
      { date, on: !isTreat },
      {
        onSuccess: () => toast({ title: isTreat ? "Treat removed" : `Treat day: +${treats?.extraKcal ?? 300} kcal today`, description: isTreat ? undefined : "Enjoy it. Next one in a week." }),
        onError: (e) => toast({ title: "Couldn't set a treat day", description: (e as Error).message, variant: "destructive" }),
      },
    );

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
          {habitFocus ? (
            <MealsDots logged={slotsLogged} />
          ) : (
            <CalorieRing eaten={totals.calories} target={target} />
          )}
          <div className="min-w-0 flex-1 space-y-3">
            {habitFocus ? (
              <div>
                <p className="font-display text-3xl font-medium tabular-nums" data-testid="text-meals-logged">
                  {slotsLogged}<span className="ml-1 text-base font-normal text-muted-foreground">of 4 meals logged</span>
                </p>
                <p className="text-sm text-muted-foreground">Aim for regular meals and a snack. Your plan isn't about cutting calories.</p>
              </div>
            ) : (
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
                  {isTreat && ` (includes +${treats?.extraKcal ?? 300} treat)`}
                </p>
              )}
            </div>
            )}
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
        {!habitFocus && plan && (atToday || isTreat) && (
          <div className="flex items-center justify-between gap-3 border-t px-5 py-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Cake className="h-4 w-4 text-dusk" />
              {isTreat ? `Treat day: +${treats?.extraKcal ?? 300} kcal added` : "Planning a treat? One a week, chosen ahead."}
            </span>
            <Button variant="ghost" size="sm" className="h-9 shrink-0 text-primary" disabled={setTreat.isPending} onClick={toggleTreat} data-testid="button-treat">
              {isTreat ? "Remove" : "Make this a treat day"}
            </Button>
          </div>
        )}
      </Card>

      <LowIntakeNote message={lowNote} onAdd={() => onAdd(defaultSlot())} />

      {atToday && !habitFocus && !isLoading && <MealIdeas left={left} date={date} slot={defaultSlot()} />}

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
                      <EntryRow key={e.id} entry={e} onEdit={() => setEditing(e)} onRemove={() => remove.mutate(e.id)} />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
      <EditFoodSheet entry={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function EntryRow({ entry, onEdit, onRemove }: { entry: FoodEntry; onEdit: () => void; onRemove: () => void }) {
  return (
    <li className="flex items-center">
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-4 pr-2 text-left transition-colors hover:bg-muted/50"
        aria-label={`Edit ${entry.name}`}
        data-testid="entry-row"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{entry.name}</span>
          <span className="block text-xs text-muted-foreground">
            {entry.servings !== 1 && `${formatServings(entry.servings)} portions · `}
            {entry.protein} g protein
          </span>
        </span>
        <span className="text-sm tabular-nums">{entry.calories}</span>
        <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      <Button variant="ghost" size="icon" className="mr-1 h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive" aria-label={`Remove ${entry.name}`} onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

function MealsDots({ logged }: { logged: number }) {
  return (
    <div className="grid h-24 w-24 shrink-0 grid-cols-2 place-items-center gap-2 p-3" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={cn("h-7 w-7 rounded-full", i < logged ? "bg-primary" : "bg-muted")} />
      ))}
    </div>
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

  const list = useMemo(() => {
    const matches = RECIPES.filter((r) => matchesDietaryPreference(r, diet))
      .filter((r) => cuisine === "Any" || r.cuisine === cuisine || r.cuisine === "Any")
      .filter((r) => meal === "All" || (SLOT_OF[r.category] ?? "Snack") === meal)
      .filter((r) => !q.trim() || `${r.name} ${r.ingredients.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase()));
    if (q.trim()) return matches;
    // New order every day so the list doesn't feel stale; Nigerian dishes lead
    const shuffled = dailyShuffle(matches, "recipes");
    const rank = (c: string) => (c === "Nigerian" ? 0 : c === "International" ? 1 : 2);
    return [...shuffled].sort((a, b) => rank(a.cuisine) - rank(b.cuisine));
  }, [diet, cuisine, meal, q]);

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
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipes or ingredients" aria-label="Search recipes" className="h-11 pl-9 text-base" />
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
