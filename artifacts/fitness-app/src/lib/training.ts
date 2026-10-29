import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { withBase } from "./base-path";

export type LoggedSet = { setNumber: number; weightKg: number | null; reps: number };
export type LastSession = Record<string, { date: string; sets: LoggedSet[] }>;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBase(path), { credentials: "same-origin", headers: { "content-type": "application/json" }, ...init });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error((data && data.error) || `Request failed (${res.status})`), { status: res.status });
  return data as T;
}

export const useLastSets = (names: string[], enabled = true) =>
  useQuery({
    queryKey: ["exercise-sets", "last", ...names],
    queryFn: () => api<LastSession>(`/api/exercise-sets/last?names=${encodeURIComponent(names.join("|"))}`),
    enabled: enabled && names.length > 0,
  });

export function useSaveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; type: string; durationMins: number; sets: (LoggedSet & { exercise: string })[] }) =>
      api<{ saved: number }>("/api/exercise-sets/session", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () =>
      qc.invalidateQueries({
        predicate: (q) => {
          const k = String(q.queryKey[0]);
          return k === "exercise-sets" || k.toLowerCase().includes("workout") || k.toLowerCase().includes("stats") || k.toLowerCase().includes("summary");
        },
      }),
  });
}

/** "8-12" → {min 8, max 12}; "10 each" → 10/10; timed ("30-45s", "20 min", "20 m") → null. */
export function repRange(reps: string): { min: number; max: number } | null {
  const m = reps.trim().match(/^(\d+)(?:\s*-\s*(\d+))?(\s+each)?$/i);
  if (!m) return null;
  const min = Number(m[1]);
  return { min, max: m[2] ? Number(m[2]) : min };
}

/** Double progression: hit the top of the range on every set → add weight (or reps if bodyweight). */
export function suggestion(last: LoggedSet[] | undefined, range: { min: number; max: number }): string | null {
  if (!last?.length) return null;
  const allTop = last.every((s) => s.reps >= range.max);
  const heaviest = Math.max(...last.map((s) => s.weightKg ?? 0));
  if (allTop) {
    if (heaviest > 0) {
      const step = heaviest >= 20 ? 2.5 : 1;
      return `You hit ${range.max} reps on every set. Try ${+(heaviest + step).toFixed(1)} kg today.`;
    }
    return `You hit ${range.max} reps on every set. Add 2 reps, or try a harder version.`;
  }
  return `Aim for ${range.max} reps on every set before going heavier.`;
}

export const formatSets = (sets: LoggedSet[]) =>
  sets.map((s) => (s.weightKg ? `${+s.weightKg.toFixed(1)}×${s.reps}` : `${s.reps}`)).join(", ");

// ---------- editing a logged session ----------
export type SessionSet = { exercise: string; setNumber: number; weightKg: number | null; reps: number };
export type SessionDetail = { id: number; name: string; type: string; durationMins: number | null; notes: string | null; loggedAt: string; date: string; sets: SessionSet[] };

export const useSessionDetail = (id: number | null) =>
  useQuery({ queryKey: ["workout-detail", id], queryFn: () => api<SessionDetail>(`/api/workouts/${id}/detail`), enabled: id != null });

function useRefreshTraining() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({
      predicate: (q) => {
        const k = String(q.queryKey[0]).toLowerCase();
        return k.includes("workout") || k === "exercise-sets" || k.includes("stats") || k.includes("summary") || k === "milestones";
      },
    });
}

export function useEditSession() {
  const refresh = useRefreshTraining();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; name?: string; type?: string; durationMins?: number | null; date?: string; sets?: SessionSet[] }) =>
      api<unknown>(`/api/workouts/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => void refresh(),
  });
}

export function useDeleteSession() {
  const refresh = useRefreshTraining();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(withBase(`/api/workouts/${id}`), { method: "DELETE", credentials: "same-origin" });
      if (!res.ok) throw new Error("Couldn't delete that session.");
    },
    onSuccess: () => void refresh(),
  });
}
