import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { withBase } from "./base-path";

export type HealthDay = {
  date: string;
  steps: number | null;
  sleepMinutes: number | null;
  avgHeartRate: number | null;
  activeEnergyKcal: number | null;
  updatedAt: string;
};

export type SyncStatus = {
  connected: boolean;
  createdAt: string | null;
  lastSyncAt: string | null;
  lastPayload: string | null;
};

const HEALTH_KEY = ["health-days"] as const;
const STATUS_KEY = ["health-sync-status"] as const;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBase(path), {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw Object.assign(new Error((data && (data.error || data.message)) || `Request failed (${res.status})`), {
      status: res.status,
    });
  }
  return data as T;
}

/** The full web address the iPhone Shortcut sends data to. */
export const syncUrl = () => `${window.location.origin}${withBase("/api/health-sync")}`;

export function useHealthDays(days = 14) {
  return useQuery<HealthDay[]>({
    queryKey: [...HEALTH_KEY, days],
    queryFn: () => api<HealthDay[]>(`/api/health?days=${days}`),
  });
}

export function useSyncStatus() {
  return useQuery<SyncStatus>({ queryKey: STATUS_KEY, queryFn: () => api<SyncStatus>("/api/health-sync/status") });
}

export function useCreateSyncKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ key: string }>("/api/health-sync/key", { method: "POST" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: STATUS_KEY }),
  });
}

export function useRevokeSyncKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<null>("/api/health-sync/key", { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: STATUS_KEY }),
  });
}

export const formatSleep = (minutes: number | null | undefined) =>
  minutes == null ? "—" : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
