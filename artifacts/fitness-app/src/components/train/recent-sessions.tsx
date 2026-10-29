import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { ChevronDown, ChevronRight, Loader2, Minus, Plus, Trash2, X } from "lucide-react";
import { getListWorkoutsQueryKey, useListWorkouts } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDeleteSession, useEditSession, useSessionDetail, type SessionSet } from "@/lib/training";
import { cn } from "@/lib/utils";

const DESKTOP =
  " md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border md:pb-0 md:max-h-[85vh] md:data-[state=open]:slide-in-from-bottom-4 md:data-[state=closed]:slide-out-to-bottom-4 md:data-[state=open]:zoom-in-95";
const TYPES = ["Strength", "Cardio", "Flexibility", "Active Recovery", "Other"];

/** Train page: the last few sessions you logged. Tap one to fix or delete it. */
export function RecentSessions() {
  const { data: workouts } = useListWorkouts({ query: { queryKey: getListWorkoutsQueryKey() } });
  const [editing, setEditing] = useState<number | null>(null);
  const recent = useMemo(() => [...(workouts ?? [])].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)).slice(0, 6), [workouts]);
  if (!recent.length) return null;

  return (
    <Card data-testid="recent-sessions">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Recent sessions</CardTitle>
        <CardDescription>Tap one to fix the sets, minutes or day, or to delete it.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {recent.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => setEditing(w.id)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50"
                data-testid="recent-session"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{w.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {format(parseISO(w.loggedAt), "EEE d MMM")} · {w.type}
                    {w.durationMins ? ` · ${w.durationMins} min` : ""}
                    {w.notes ? ` · ${w.notes}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDistanceToNowStrict(parseISO(w.loggedAt), { addSuffix: true })}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
      <EditSessionSheet id={editing} onClose={() => setEditing(null)} />
    </Card>
  );
}

type Row = { exercise: string; weight: string; reps: string };

function EditSessionSheet({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data, isLoading } = useSessionDetail(id);
  const edit = useEditSession();
  const del = useDeleteSession();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState("Strength");
  const [minutes, setMinutes] = useState("");
  const [date, setDate] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openEx, setOpenEx] = useState<Set<string>>(new Set());
  const toggleEx = (ex: string) =>
    setOpenEx((prev) => {
      const next = new Set(prev);
      next.has(ex) ? next.delete(ex) : next.add(ex);
      return next;
    });

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setType(data.type);
    setMinutes(data.durationMins ? String(data.durationMins) : "");
    setDate(data.date);
    setRows(data.sets.map((s) => ({ exercise: s.exercise, weight: s.weightKg != null ? String(s.weightKg) : "", reps: String(s.reps) })));
    setConfirmDelete(false);
    // Short sessions open fully; longer ones fold so you can scan to the exercise you need
    const names = [...new Set(data.sets.map((x) => x.exercise))];
    setOpenEx(new Set(names.length <= 2 ? names : []));
  }, [data]);

  // Group rows by exercise, keeping the logged order
  const groups = useMemo(() => {
    const order: string[] = [];
    rows.forEach((r) => !order.includes(r.exercise) && order.push(r.exercise));
    return order.map((ex) => ({ exercise: ex, indexes: rows.map((r, i) => (r.exercise === ex ? i : -1)).filter((i) => i >= 0) }));
  }, [rows]);

  const setRow = (i: number, patch: Partial<Row>) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async () => {
    if (id == null) return;
    const counters = new Map<string, number>();
    const sets: SessionSet[] = rows
      .filter((r) => Number(r.reps) > 0)
      .map((r) => {
        const n = (counters.get(r.exercise) ?? 0) + 1;
        counters.set(r.exercise, n);
        return { exercise: r.exercise, setNumber: n, weightKg: r.weight ? Number(r.weight) : null, reps: Math.round(Number(r.reps)) };
      });
    try {
      await edit.mutateAsync({ id, name: name.trim(), type, durationMins: minutes ? Number(minutes) : null, date, ...(data?.sets.length || rows.length ? { sets } : {}) });
      toast({ title: "Session updated" });
      onClose();
    } catch (err) {
      toast({ title: "Couldn't save", description: (err as Error).message, variant: "destructive" });
    }
  };

  const remove = async () => {
    if (id == null) return;
    await del.mutateAsync(id);
    toast({ title: "Session deleted", description: "Its sets were removed too." });
    onClose();
  };

  const today = new Date().toLocaleDateString("en-CA");
  return (
    <Sheet open={id != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={"mx-auto flex max-h-[92dvh] w-full max-w-xl flex-col gap-0 rounded-t-3xl p-0 pb-[env(safe-area-inset-bottom)]" + DESKTOP}
        data-testid="edit-session-sheet"
      >
        <SheetHeader className="border-b px-5 pb-4 pt-5 text-left">
          <SheetTitle className="font-display text-xl font-medium">Edit session</SheetTitle>
          <SheetDescription>Fix anything you logged by mistake.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {isLoading || !data ? (
            <Loader2 className="mx-auto mt-8 h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="s-name">Name</Label>
                <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 text-base" maxLength={120} />
              </div>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={type === t}
                    onClick={() => setType(t)}
                    className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", type === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="s-min">Minutes</Label>
                  <Input id="s-min" type="number" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-date">Day</Label>
                  <Input id="s-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
                </div>
              </div>

              {groups.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Sets</p>
                  {groups.map((g) => (
                    <section key={g.exercise} className="rounded-xl border p-3" data-testid="edit-exercise">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => toggleEx(g.exercise)}
                          aria-expanded={openEx.has(g.exercise)}
                          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-left"
                          data-testid="button-toggle-exercise"
                        >
                          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", openEx.has(g.exercise) && "rotate-180")} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{g.exercise}</span>
                            {!openEx.has(g.exercise) && (
                              <span className="block truncate text-xs text-muted-foreground tabular-nums">
                                {g.indexes.map((i) => (rows[i].weight ? `${rows[i].weight}×${rows[i].reps || 0}` : rows[i].reps || "0")).join(", ")}
                              </span>
                            )}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="flex h-9 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
                          onClick={() => setRows((list) => list.filter((r) => r.exercise !== g.exercise))}
                          aria-label={`Remove all ${g.exercise} sets`}
                        >
                          <X className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                      {openEx.has(g.exercise) && (
                      <div className="mt-1">
                      <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem] gap-2 px-0.5 text-[11px] font-semibold text-muted-foreground">
                        <span>Set</span><span>kg</span><span>Reps</span><span />
                      </div>
                      {g.indexes.map((i, n) => (
                        <div key={i} className="mt-1.5 grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2">
                          <span className="text-center text-sm font-semibold">{n + 1}</span>
                          <Input
                            inputMode="decimal"
                            value={rows[i].weight}
                            placeholder="–"
                            onChange={(e) => setRow(i, { weight: e.target.value.replace(/[^\d.]/g, "") })}
                            className="h-11 text-center tabular-nums"
                            aria-label={`${g.exercise} set ${n + 1} kg`}
                          />
                          <Input
                            inputMode="numeric"
                            value={rows[i].reps}
                            onChange={(e) => setRow(i, { reps: e.target.value.replace(/\D/g, "") })}
                            className="h-11 text-center tabular-nums"
                            aria-label={`${g.exercise} set ${n + 1} reps`}
                          />
                          <button
                            type="button"
                            onClick={() => setRows((list) => list.filter((_, j) => j !== i))}
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
                            aria-label={`Remove set ${n + 1}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-9 gap-1 text-xs"
                        onClick={() => {
                          const last = rows[g.indexes.at(-1)!];
                          setRows((list) => {
                            const at = g.indexes.at(-1)! + 1;
                            return [...list.slice(0, at), { ...last }, ...list.slice(at)];
                          });
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" /> Set
                      </Button>
                      </div>
                      )}
                    </section>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">No sets were logged for this session.</p>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 border-t px-5 py-4">
          {confirmDelete ? (
            <Button variant="destructive" className="h-12 flex-1 gap-2" onClick={() => void remove()} disabled={del.isPending} data-testid="button-confirm-delete-session">
              {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Yes, delete session
            </Button>
          ) : (
            <Button variant="outline" className="h-12 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)} data-testid="button-delete-session">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          {!confirmDelete && (
            <Button className="h-12 flex-1 text-base" onClick={() => void save()} disabled={edit.isPending || !data || !name.trim()} data-testid="button-save-session">
              {edit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          )}
          {confirmDelete && (
            <Button variant="ghost" className="h-12" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
