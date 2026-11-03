import { useQuery } from "@tanstack/react-query";
import { withBase } from "./base-path";

const get = async <T,>(path: string): Promise<T> => {
  const res = await fetch(withBase(path), { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return (await res.json()) as T;
};

/** What the admin should look at: shared by the menu badges and the Overview card (same cache as the cards). */
export function useAdminAlerts() {
  const problems = useQuery({
    queryKey: ["admin-errors", "open"],
    queryFn: () => get<{ emailOn: boolean; errors: { id: number; count: number; source: string }[] }>("/api/admin/errors"),
    refetchInterval: 60_000,
  });
  const backups = useQuery({
    queryKey: ["admin-backups"],
    queryFn: () => get<{ lastServer: string | null; lastOffsite: string | null }>("/api/admin/backups"),
  });
  const fresh = (iso: string | null | undefined) => !!iso && Date.now() - Date.parse(iso) < 36 * 3600 * 1000;
  return {
    openProblems: problems.data?.errors.length ?? 0,
    emailOn: problems.data?.emailOn ?? null,
    offsiteOk: backups.data ? fresh(backups.data.lastOffsite) : null,
    serverOk: backups.data ? fresh(backups.data.lastServer) : null,
    loaded: !!problems.data && !!backups.data,
  };
}
