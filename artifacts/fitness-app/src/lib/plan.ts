import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGetProfileQueryKey, useGetProfile } from "@workspace/api-client-react";
import { buildPlan, type Plan, type TargetOverrides } from "@workspace/plan";
import { withBase } from "./base-path";

export const OVERRIDES_QUERY_KEY = ["plan-overrides"] as const;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBase(path), {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw Object.assign(new Error((data && data.error) || `Request failed (${res.status})`), { status: res.status });
  }
  return data as T;
}

export function useTargetOverrides() {
  return useQuery<TargetOverrides>({
    queryKey: OVERRIDES_QUERY_KEY,
    queryFn: () => api<TargetOverrides>("/api/plan-overrides"),
  });
}

export function useSaveTargetOverrides() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (overrides: TargetOverrides) =>
      api<TargetOverrides>("/api/plan-overrides", { method: "PUT", body: JSON.stringify(overrides) }),
    onSuccess: (saved) => {
      qc.setQueryData(OVERRIDES_QUERY_KEY, saved);
      // Habit goals for today come from the server's copy of the targets
      void qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes("habits") });
    },
  });
}

/**
 * The signed-in user's personal plan: targets, weekly schedule, workout sessions and plan cards,
 * all derived from their onboarding answers plus any targets they set by hand.
 */
export function usePlan(): { plan: Plan | null; isLoading: boolean } {
  const profileQuery = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const overridesQuery = useTargetOverrides();
  const profile = profileQuery.data;
  const overrides = overridesQuery.data;

  const plan = useMemo(
    () => (profile ? buildPlan(profile, overrides ?? {}) : null),
    [profile, overrides],
  );
  return { plan, isLoading: profileQuery.isLoading || overridesQuery.isLoading };
}
