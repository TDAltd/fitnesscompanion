import { useMemo } from "react";
import { Lightbulb, Plus } from "lucide-react";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RECIPES, matchesDietaryPreference } from "@/lib/recipes";
import { useAddFood, useRecentFoods, type Slot } from "@/lib/food-log";
import { dailyShuffle } from "@/lib/daily";

type Idea = { name: string; calories: number; protein: number; carbs: number; fat: number; why: string; source: "recent" | "recipe" };

/**
 * Up to 3 ideas that fit the calories left today: 2 of your own regular foods,
 * plus 1 new higher-protein recipe, so the same few meals don't repeat forever.
 */
export function MealIdeas({ left, date, slot }: { left: number; date: string; slot: Slot }) {
  const { data: recent } = useRecentFoods();
  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const add = useAddFood();
  const { toast } = useToast();

  const ideas = useMemo<Idea[]>(() => {
    if (left < 150) return [];
    const fits = (kcal: number) => kcal >= 80 && kcal <= left;
    // Rotate daily through your regulars that fit, so the same two don't always show
    const mine = dailyShuffle((recent ?? []).filter((r) => fits(r.calories)), `ideas-mine-${slot}`, date)
      .slice(0, 2)
      .map<Idea>((r) => ({ ...r, why: "One of your regulars", source: "recent" }));
    const known = new Set(mine.map((m) => m.name.toLowerCase()));
    const slotCategory = slot === "Snack" ? "Fruit" : slot;
    const fresh = dailyShuffle(
      RECIPES.filter((r) => matchesDietaryPreference(r, profile?.dietaryPreference)).filter(
        (r) => fits(r.calories) && r.protein >= 20 && !known.has(r.name.toLowerCase()),
      ),
      `ideas-new-${slot}`,
      date,
    ).sort((a, b) => Number(b.category === slotCategory) - Number(a.category === slotCategory));
    // A different new idea each day, matching the meal when possible
    const pick = fresh[0] ?? null;
    return [...mine, ...(pick ? [{ name: pick.name, calories: pick.calories, protein: pick.protein, carbs: pick.carbs, fat: pick.fat, why: "Something new, high in protein", source: "recipe" as const }] : [])];
  }, [left, recent, profile?.dietaryPreference, slot, date]);

  if (!ideas.length) return null;
  return (
    <Card data-testid="meal-ideas">
      <CardContent className="space-y-3 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Lightbulb className="h-4 w-4 text-dusk" /> Ideas that fit your {left.toLocaleString()} kcal left
        </p>
        <ul className="divide-y">
          {ideas.map((i) => (
            <li key={i.name} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{i.name}</p>
                <p className="text-xs text-muted-foreground">{i.calories} kcal · {i.protein} g protein · {i.why}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-9 shrink-0 gap-1"
                disabled={add.isPending}
                onClick={() =>
                  add.mutate(
                    { date, slot, name: i.name, servings: 1, calories: i.calories, protein: i.protein, carbs: i.carbs, fat: i.fat, source: i.source },
                    { onSuccess: () => toast({ title: `Added to ${slot === "Snack" ? "snacks" : slot.toLowerCase()}`, description: i.name }) },
                  )
                }
                aria-label={`Add ${i.name}`}
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
