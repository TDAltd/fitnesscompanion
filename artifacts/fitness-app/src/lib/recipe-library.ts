import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RECIPES, type Cuisine } from "./recipes";
import { withBase } from "./base-path";

export type CustomRecipe = {
  id: number;
  name: string;
  category: string;
  cuisine: string;
  prepMins: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  steps: string[];
  hidden: boolean;
  source: string;
  hasPhoto: boolean;
  photoVersion: number;
};

/** One recipe as the app shows it. Custom recipes get ids from 100000 up so they never clash with built-in ones. */
export type LibraryRecipe = {
  id: number;
  name: string;
  category: string;
  cuisine: Cuisine;
  prepMins: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  steps: string[];
  photoUrl?: string;
  custom?: boolean;
};

export const CUSTOM_ID_OFFSET = 100000;
export const photoUrl = (r: Pick<CustomRecipe, "id" | "photoVersion">) => withBase(`/api/recipes/${r.id}/photo?v=${r.photoVersion}`);

async function fetchLibrary(): Promise<{ custom: CustomRecipe[]; hiddenBuiltin: number[] }> {
  const res = await fetch(withBase("/api/recipes"), { credentials: "same-origin" });
  if (!res.ok) return { custom: [], hiddenBuiltin: [] };
  return res.json();
}

export const toLibrary = (r: CustomRecipe): LibraryRecipe => ({
  id: CUSTOM_ID_OFFSET + r.id,
  name: r.name,
  category: r.category,
  cuisine: (["Nigerian", "International", "Any"].includes(r.cuisine) ? r.cuisine : "Any") as Cuisine,
  prepMins: r.prepMins ?? 0,
  calories: r.calories,
  protein: r.protein,
  carbs: r.carbs,
  fat: r.fat,
  ingredients: r.ingredients,
  steps: r.steps,
  photoUrl: r.hasPhoto ? photoUrl(r) : undefined,
  custom: true,
});

/** Built-in recipes (minus any an admin hid) plus the ones added in Admin. Built-in only until loaded. */
export function useRecipeLibrary(): LibraryRecipe[] {
  const { data } = useQuery({ queryKey: ["recipes"], queryFn: fetchLibrary, staleTime: 10 * 60 * 1000 });
  return useMemo(() => {
    const hidden = new Set(data?.hiddenBuiltin ?? []);
    const builtIn = RECIPES.filter((r) => !hidden.has(r.id)) as unknown as LibraryRecipe[];
    return [...(data?.custom ?? []).map(toLibrary), ...builtIn];
  }, [data]);
}
