import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { withBase } from "./base-path";

export type Slot = "Breakfast" | "Lunch" | "Dinner" | "Snack";
export const SLOTS: { slot: Slot; label: string }[] = [
  { slot: "Breakfast", label: "Breakfast" },
  { slot: "Lunch", label: "Lunch" },
  { slot: "Dinner", label: "Dinner" },
  { slot: "Snack", label: "Snacks" },
];

export type FoodEntry = {
  id: number;
  date: string;
  slot: Slot;
  name: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type RecentFood = { name: string; slot: Slot; uses: number; calories: number; protein: number; carbs: number; fat: number };

/** What the add sheet sends: values are per ONE portion; the server multiplies by servings. */
export type NewFood = {
  date: string;
  slot: Slot;
  name: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source?: "food" | "recipe" | "recent" | "ai" | "quick";
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBase(path), { credentials: "same-origin", headers: { "content-type": "application/json" }, ...init });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error((data && data.error) || `Request failed (${res.status})`), { status: res.status });
  return data as T;
}

export const useFoodLog = (date: string) =>
  useQuery({ queryKey: ["food-log", date], queryFn: () => api<FoodEntry[]>(`/api/food-log?date=${date}`) });

export const useRecentFoods = () => useQuery({ queryKey: ["food-log", "recent"], queryFn: () => api<RecentFood[]>("/api/food-log/recent") });

export const useFoodTotals = (from: string, to: string) =>
  useQuery({
    queryKey: ["food-log", "totals", from, to],
    queryFn: () => api<{ date: string; calories: number; protein: number }[]>(`/api/food-log/totals?from=${from}&to=${to}`),
  });

/** Refresh the diary and everything that reads the same entries (Today screen, checklist). */
function useRefresh() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({
      predicate: (q) => {
        const k = String(q.queryKey[0]);
        return k === "food-log" || k.includes("meal-plan");
      },
    });
}

export function useAddFood() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (food: NewFood) => api<FoodEntry>("/api/food-log", { method: "POST", body: JSON.stringify(food) }),
    onSuccess: () => void refresh(),
  });
}

export function useRemoveFood() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: number) => api<null>(`/api/food-log/${id}`, { method: "DELETE" }),
    onSuccess: () => void refresh(),
  });
}

export const formatServings = (s: number) => {
  const whole = Math.floor(s);
  const frac = s - whole;
  const f = frac === 0.5 ? "½" : frac === 0.25 ? "¼" : frac === 0.75 ? "¾" : frac ? String(frac) : "";
  return `${whole || ""}${f}` || "0";
};

// ---------- planned treat meal ----------
export type Treats = { extraKcal: number; dates: string[] };

export const useTreats = (from: string, to: string) =>
  useQuery({ queryKey: ["food-log", "treats", from, to], queryFn: () => api<Treats>(`/api/treats?from=${from}&to=${to}`) });

export function useSetTreat() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: { date: string; on: boolean }) => api<{ date: string; on: boolean }>("/api/treats", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => void refresh(),
  });
}

/** The calorie target for one day: the plan's target, plus the treat allowance on a planned treat day. */
export const targetFor = (date: string, base: number, treats?: Treats) =>
  base + (treats?.dates.includes(date) ? treats.extraKcal : 0);
