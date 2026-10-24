import { useQuery, useQueryClient } from "@tanstack/react-query";
import { withBase } from "./base-path";

export type AuthUser = { id: number; email: string; isAdmin?: boolean };

export const AUTH_QUERY_KEY = ["auth", "me"] as const;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBase(url), {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && typeof data.error === "string" && data.error) || `Request failed (${res.status})`;
    throw Object.assign(new Error(message), { status: res.status });
  }
  return data as T;
}

export function useCurrentUser() {
  return useQuery<AuthUser | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        return await request<AuthUser>("/api/auth/me");
      } catch (err) {
        if ((err as { status?: number }).status === 401) return null;
        throw err;
      }
    },
    staleTime: Infinity,
    retry: 1,
  });
}

export function useAuthActions() {
  const qc = useQueryClient();

  const afterAuth = (user: AuthUser | null) => {
    // Drop everything cached for the previous user before showing the new one's data
    // (keep the auth query itself so the screen stays subscribed to it)
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== AUTH_QUERY_KEY[0] });
    qc.setQueryData(AUTH_QUERY_KEY, user);
  };

  return {
    login: async (email: string, password: string) =>
      afterAuth(await request<AuthUser>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })),
    signup: async (email: string, password: string) =>
      afterAuth(await request<AuthUser>("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) })),
    logout: async () => {
      await request("/api/auth/logout", { method: "POST" });
      afterAuth(null);
    },
  };
}

export async function importData(file: File): Promise<Record<string, number>> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON. Use the export file exactly as downloaded.");
  }
  // The Replit SQL export can come back wrapped as [{ "export": {...} }] or { "export": {...} }
  if (Array.isArray(parsed) && parsed.length === 1) parsed = parsed[0];
  if (parsed && typeof parsed === "object" && "export" in parsed) parsed = (parsed as { export: unknown }).export;
  const result = await request<{ imported: Record<string, number> }>("/api/import", {
    method: "POST",
    body: JSON.stringify(parsed),
  });
  return result.imported;
}
