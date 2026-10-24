import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { withBase } from "./base-path";

export type AdminOverview = {
  totals: { users: number; new7d: number; new30d: number; disabled: number; active1d: number; active7d: number; active30d: number };
  signups: { date: string; count: number }[];
  features: { key: string; label: string; users: number; percent: number }[];
  retention: { days: number; cohort: number; retained: number; percent: number | null }[];
  signupsOpen: boolean;
};

export type AdminUser = {
  id: number;
  email: string;
  name: string | null;
  isAdmin: boolean;
  adminFromSettings: boolean;
  createdAt: string | null;
  lastActiveAt: string | null;
  disabled: boolean;
  profile: { goal: string | null; daysPerWeek: number | null; location: string | null; experience: string | null };
  usage: {
    activeDays: number;
    meals: number;
    workouts: number;
    weighIns: number;
    habitDays: number;
    aiEstimates: number;
    appleHealth: boolean;
  };
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBase(path), {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data as T;
}

const OVERVIEW = ["admin", "overview"] as const;
const USERS = ["admin", "users"] as const;

export const useAdminOverview = () => useQuery({ queryKey: OVERVIEW, queryFn: () => api<AdminOverview>("/api/admin/overview") });
export const useAdminUsers = () => useQuery({ queryKey: USERS, queryFn: () => api<AdminUser[]>("/api/admin/users") });

/** One mutation hook for every admin action; refreshes the dashboard afterwards. */
export function useAdminAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ path, method = "POST", body }: { path: string; method?: string; body?: unknown }) =>
      api<Record<string, unknown>>(`/api/admin${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}
