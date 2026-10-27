import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Camera, ChevronRight, History, Loader2, PencilLine, Search, Sparkles, X } from "lucide-react";
import { useGetProfile, getGetProfileQueryKey, useNutritionLookup } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FOODS } from "@/lib/foods";
import { RECIPES, matchesDietaryPreference } from "@/lib/recipes";
import { SLOTS, formatServings, useAddFood, useRecentFoods, type Slot } from "@/lib/food-log";
import { compressMealPhoto } from "@/lib/photo";
import { cn } from "@/lib/utils";

type Pick = {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "food" | "recipe" | "recent" | "ai";
  note?: string;
};

const PORTIONS = [0.5, 1, 1.5, 2];

export function AddFoodSheet({
  open,
  onOpenChange,
  date,
  slot: initialSlot,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  slot: Slot;
}) {
  const [mode, setMode] = useState<"search" | "ai" | "quick">("search");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Pick | null>(null);
  const [servings, setServings] = useState(1);
  const [slot, setSlot] = useState<Slot>(initialSlot);
  const { data: recent } = useRecentFoods();
  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const add = useAddFood();
  const { toast } = useToast();

  // Reset each time the sheet opens
  useEffect(() => {
    if (open) {
      setMode("search");
      setQuery("");
      setPicked(null);
      setServings(1);
      setSlot(initialSlot);
    }
  }, [open, initialSlot]);

  const diet = profile?.dietaryPreference;
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    const foods = FOODS.filter((f) => matchesDietaryPreference({ name: f.name, ingredients: f.ingredients, protein: f.protein }, diet))
      .filter((f) => !q || f.name.toLowerCase().includes(q))
      .map<Pick>((f) => ({ name: f.name, portion: f.portion, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, source: "food" }));
    const recipes = RECIPES.filter((r) => matchesDietaryPreference(r, diet))
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .map<Pick>((r) => ({ name: r.name, portion: "1 serving (recipe)", calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat, source: "recipe" }));
    const mine = (recent ?? [])
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .map<Pick>((r) => ({ name: r.name, portion: "1 portion, same as last time", calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat, source: "recent" }));
    if (!q) {
      // No search yet: your recent foods, then popular picks for this meal
      const popular = FOODS.filter((f) => f.slot === slot)
        .filter((f) => matchesDietaryPreference({ name: f.name, ingredients: f.ingredients, protein: f.protein }, diet))
        .slice(0, 8)
        .map<Pick>((f) => ({ name: f.name, portion: f.portion, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, source: "food" }));
      return { mine, list: popular };
    }
    return { mine, list: [...foods, ...recipes].slice(0, 30) };
  }, [q, recent, diet, slot]);

  const save = async (food: Pick | { name: string; calories: number; protein: number; carbs: number; fat: number; source: "quick" }, portions: number) => {
    try {
      await add.mutateAsync({
        date,
        slot,
        name: food.name,
        servings: portions,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        source: food.source,
      });
      toast({ title: `Added to ${slot === "Snack" ? "snacks" : slot.toLowerCase()}`, description: food.name });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Couldn't add that", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto flex max-h-[92dvh] w-full max-w-xl flex-col gap-0 rounded-t-3xl p-0 pb-[env(safe-area-inset-bottom)] md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border md:pb-0 md:data-[state=open]:slide-in-from-bottom-4 md:data-[state=closed]:slide-out-to-bottom-4 md:data-[state=open]:zoom-in-95 md:max-h-[85vh]"
      >
        <SheetHeader className="space-y-1 border-b px-5 pb-4 pt-5 text-left">
          <div className="flex items-center gap-2">
            {(picked || mode !== "search") && (
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 h-8 w-8"
                aria-label="Back"
                onClick={() => (picked ? setPicked(null) : setMode("search"))}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <SheetTitle className="font-display text-xl font-medium">
              {picked ? "How much?" : mode === "ai" ? "Describe or snap it" : mode === "quick" ? "Quick add" : "Add food"}
            </SheetTitle>
          </div>
          <SheetDescription className="sr-only">Search for a food, use a photo, or type calories to add it to your diary.</SheetDescription>
          {/* Which meal it goes into */}
          <div className="flex gap-1.5 pt-2" role="radiogroup" aria-label="Meal">
            {SLOTS.map((s) => (
              <button
                key={s.slot}
                type="button"
                role="radio"
                aria-checked={slot === s.slot}
                onClick={() => setSlot(s.slot)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  slot === s.slot ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {picked ? (
            <PortionStep picked={picked} servings={servings} setServings={setServings} />
          ) : mode === "ai" ? (
            <AiStep onEstimate={(p) => { setPicked(p); setServings(1); }} />
          ) : mode === "quick" ? (
            <QuickStep busy={add.isPending} onSave={(f) => void save({ ...f, source: "quick" }, 1)} />
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search: jollof, eba, egg, suya…"
                  aria-label="Search foods"
                  className="h-11 pl-9 pr-9 text-base"
                  data-testid="input-food-search"
                />
                {query && (
                  <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-11 justify-start gap-2" onClick={() => setMode("ai")} data-testid="button-food-ai">
                  <Camera className="h-4 w-4 text-primary" /> Photo or describe
                </Button>
                <Button variant="outline" className="h-11 justify-start gap-2" onClick={() => setMode("quick")} data-testid="button-food-quick">
                  <PencilLine className="h-4 w-4 text-primary" /> Quick add calories
                </Button>
              </div>

              {results.mine.length > 0 && (
                <section>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <History className="h-3.5 w-3.5" /> {q ? "From your diary" : "You often have"}
                  </h3>
                  <FoodList items={results.mine.slice(0, q ? 5 : 6)} onPick={(p) => { setPicked(p); setServings(1); }} />
                </section>
              )}

              <section>
                <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  {q ? "Foods and recipes" : `Popular for ${slot === "Snack" ? "snacks" : slot.toLowerCase()}`}
                </h3>
                {results.list.length ? (
                  <FoodList items={results.list} onPick={(p) => { setPicked(p); setServings(1); }} />
                ) : (
                  <div className="rounded-xl bg-muted/50 p-4 text-sm">
                    <p>No match for "{query}".</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setMode("ai")}>Estimate it with AI</Button>
                      <Button size="sm" variant="outline" onClick={() => setMode("quick")}>Type the calories</Button>
                    </div>
                  </div>
                )}
              </section>
              <p className="pb-2 text-xs text-muted-foreground">Calories are estimates for a typical portion. Home cooking varies, especially the oil.</p>
            </div>
          )}
        </div>

        {picked && (
          <div className="border-t px-5 py-4">
            <Button className="h-12 w-full text-base" disabled={add.isPending} onClick={() => void save(picked, servings)} data-testid="button-add-food">
              {add.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add {Math.round(picked.calories * servings).toLocaleString()} kcal
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function FoodList({ items, onPick }: { items: Pick[]; onPick: (p: Pick) => void }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border">
      {items.map((f) => (
        <li key={`${f.source}-${f.name}`}>
          <button
            type="button"
            onClick={() => onPick(f)}
            className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/60"
            data-testid="food-result"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{f.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{f.portion}</span>
            </span>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{f.calories} kcal</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function PortionStep({ picked, servings, setServings }: { picked: Pick; servings: number; setServings: (n: number) => void }) {
  const t = (n: number) => Math.round(n * servings);
  return (
    <div className="space-y-5">
      <div>
        <p className="font-display text-xl font-medium">{picked.name}</p>
        <p className="text-sm text-muted-foreground">One portion = {picked.portion}</p>
        {picked.note && <p className="mt-1 text-sm text-muted-foreground">{picked.note}</p>}
      </div>
      <div>
        <Label className="mb-2 block text-sm font-semibold">Portions</Label>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Portions">
          {PORTIONS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={servings === p}
              onClick={() => setServings(p)}
              className={cn(
                "h-12 rounded-xl border text-lg font-semibold transition-colors",
                servings === p ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
              data-testid={`portion-${p}`}
            >
              {formatServings(p)}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Other amount:</span>
          <Input
            type="number"
            inputMode="decimal"
            min={0.25}
            max={10}
            step={0.25}
            value={servings}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n > 0 && n <= 10) setServings(n);
            }}
            className="h-9 w-24"
            aria-label="Number of portions"
          />
        </div>
      </div>
      <dl className="grid grid-cols-4 gap-2 rounded-xl bg-muted/50 p-3 text-center">
        {[
          ["Calories", t(picked.calories), ""],
          ["Protein", t(picked.protein), "g"],
          ["Carbs", t(picked.carbs), "g"],
          ["Fat", t(picked.fat), "g"],
        ].map(([label, v, unit]) => (
          <div key={label as string}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-display text-lg font-medium tabular-nums">
              {(v as number).toLocaleString()}
              {unit}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function AiStep({ onEstimate }: { onEstimate: (p: Pick) => void }) {
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const lookup = useNutritionLookup();
  const { toast } = useToast();

  const estimate = () =>
    lookup.mutate(
      { data: { mealName: text.trim() || undefined, imageData: photo || undefined } },
      {
        onSuccess: (r) =>
          onEstimate({
            name: r.mealName,
            portion: text.trim() ? `as described: "${text.trim().slice(0, 60)}"` : "the portion in your photo",
            calories: r.calories,
            protein: r.protein,
            carbs: r.carbs,
            fat: r.fat,
            source: "ai",
            note: r.notes ? `AI estimate: ${r.notes}` : "AI estimate: check it looks right.",
          }),
        onError: (err) =>
          toast({
            title: "Couldn't estimate that",
            description: (err as { status?: number }).status === 429
              ? "You've reached today's limit of AI estimates. Use search or quick add."
              : "Try describing it differently, or use quick add.",
            variant: "destructive",
          }),
      },
    );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ai-text" className="font-semibold">What did you eat?</Label>
        <Input
          id="ai-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. 1 plate of eba and egusi with 2 pieces of beef"
          className="h-11 text-base"
          maxLength={300}
          data-testid="input-ai-describe"
        />
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            setPhoto(await compressMealPhoto(f));
          } catch (err) {
            toast({ title: "Photo couldn't be used", description: (err as Error).message, variant: "destructive" });
          }
        }}
      />
      {photo ? (
        <div className="relative overflow-hidden rounded-xl border">
          <img src={photo} alt="Your meal" className="max-h-52 w-full object-cover" />
          <Button size="sm" variant="secondary" className="absolute right-2 top-2" onClick={() => setPhoto(null)}>Remove</Button>
        </div>
      ) : (
        <Button variant="outline" className="h-11 w-full gap-2" onClick={() => input.current?.click()}>
          <Camera className="h-4 w-4" /> Take or choose a photo
        </Button>
      )}
      <Button className="h-12 w-full gap-2 text-base" disabled={(!text.trim() && !photo) || lookup.isPending} onClick={estimate} data-testid="button-ai-estimate">
        {lookup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {lookup.isPending ? "Estimating…" : "Estimate calories"}
      </Button>
      <p className="text-xs text-muted-foreground">Photos are sent to OpenAI for the estimate and aren't stored. You can adjust the portion next.</p>
    </div>
  );
}

function QuickStep({ busy, onSave }: { busy: boolean; onSave: (f: { name: string; calories: number; protein: number; carbs: number; fat: number }) => void }) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const valid = Number(kcal) > 0 && Number(kcal) <= 5000;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ name: name.trim() || "Quick add", calories: Number(kcal), protein: Number(protein) || 0, carbs: 0, fat: 0 });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="q-kcal" className="font-semibold">Calories</Label>
        <Input id="q-kcal" type="number" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="e.g. 450" className="h-12 text-lg" autoFocus data-testid="input-quick-kcal" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="q-name">Name <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input id="q-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Lunch out" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="q-protein">Protein g <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input id="q-protein" type="number" inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="0" />
        </div>
      </div>
      <Button type="submit" className="h-12 w-full text-base" disabled={!valid || busy} data-testid="button-quick-add">
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Add {valid ? `${Number(kcal).toLocaleString()} kcal` : ""}
      </Button>
    </form>
  );
}
