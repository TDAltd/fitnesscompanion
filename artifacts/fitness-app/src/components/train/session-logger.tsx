import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, ExternalLink, Loader2, Minus, Plus, TrendingUp } from "lucide-react";
import type { Session } from "@workspace/plan";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatSets, repRange, suggestion, useLastSets, useSaveSession } from "@/lib/training";
import { cn } from "@/lib/utils";

type Row = { weight: string; reps: string; done: boolean };
type ExState = { name: string; target: string; url: string; range: { min: number; max: number } | null; rows: Row[]; timedDone: boolean };

const TYPE_FOR: Record<string, string> = { CARDIO: "Cardio", INTERVALS: "Cardio", LONG: "Cardio", CORE: "Flexibility" };

export function SessionLogger({ session, open, onOpenChange }: { session: Session; open: boolean; onOpenChange: (o: boolean) => void }) {
  const names = useMemo(() => session.exercises.filter((e) => repRange(e.reps)).map((e) => e.name), [session]);
  const { data: last, isLoading } = useLastSets(names, open);
  const save = useSaveSession();
  const { toast } = useToast();
  const started = useRef(Date.now());
  const [state, setState] = useState<ExState[]>([]);
  const built = useRef(false);

  // Build the form once each time it opens, pre-filled with last time's numbers
  useEffect(() => {
    if (!open) {
      built.current = false;
      return;
    }
    if (isLoading || built.current) return;
    built.current = true;
    started.current = Date.now();
    setState(
      session.exercises.map((e) => {
        const range = repRange(e.reps);
        const prev = last?.[e.name]?.sets ?? [];
        return {
          name: e.name,
          target: e.reps,
          url: e.url,
          range,
          timedDone: false,
          rows: range
            ? Array.from({ length: e.sets }, (_, i) => ({
                weight: prev[i]?.weightKg != null ? String(prev[i].weightKg) : prev[0]?.weightKg != null ? String(prev[0].weightKg) : "",
                reps: String(range.max),
                done: false,
              }))
            : [],
        };
      }),
    );
  }, [open, isLoading, session, last]);

  const update = (i: number, fn: (e: ExState) => ExState) => setState((s) => s.map((e, j) => (j === i ? fn(e) : e)));
  const doneSets = state.reduce((n, e) => n + e.rows.filter((r) => r.done).length, 0);
  const anything = doneSets > 0 || state.some((e) => e.timedDone);

  const finish = async () => {
    const sets = state.flatMap((e) =>
      e.rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.done && Number(r.reps) > 0)
        .map(({ r, i }) => ({ exercise: e.name, setNumber: i + 1, weightKg: r.weight ? Number(r.weight) : null, reps: Math.round(Number(r.reps)) })),
    );
    const mins = Math.max(1, Math.round((Date.now() - started.current) / 60000));
    try {
      await save.mutateAsync({ title: session.title, type: TYPE_FOR[session.id] ?? "Strength", durationMins: Math.min(mins, session.durationMinutes * 3), sets });
      toast({ title: "Session saved", description: sets.length ? `${sets.length} sets logged. Nice work.` : "Logged as done. Nice work." });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Couldn't save", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto flex h-[94dvh] w-full max-w-xl flex-col gap-0 rounded-t-3xl p-0 pb-[env(safe-area-inset-bottom)] md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border md:pb-0 md:data-[state=open]:slide-in-from-bottom-4 md:data-[state=closed]:slide-out-to-bottom-4 md:data-[state=open]:zoom-in-95 md:h-[85vh]">
        <SheetHeader className="border-b px-5 pb-4 pt-5 text-left">
          <SheetTitle className="font-display text-xl font-medium">{session.title}</SheetTitle>
          <SheetDescription>Tick each set as you finish it. Numbers from last time are filled in.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {isLoading || !state.length ? (
            <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            state.map((e, i) => {
              const prev = last?.[e.name];
              const tip = e.range ? suggestion(prev?.sets, e.range) : null;
              return (
                <section key={e.name + i} className="rounded-2xl border p-4" data-testid="logger-exercise">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-snug">{e.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Target {e.rows.length || 1} × {e.target}
                        {prev && ` · Last time (${format(parseISO(prev.date), "d MMM")}): ${formatSets(prev.sets)}`}
                      </p>
                    </div>
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-primary" aria-label={`How to do ${e.name}`}>
                      Form <ExternalLink className="inline h-3 w-3" />
                    </a>
                  </div>
                  {tip && (
                    <p className="mt-2 flex gap-1.5 rounded-lg bg-dusk/10 px-2.5 py-1.5 text-xs">
                      <TrendingUp className="h-3.5 w-3.5 shrink-0 translate-y-px text-dusk" /> {tip}
                    </p>
                  )}

                  {e.range ? (
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem] gap-2 px-0.5 text-[11px] font-semibold text-muted-foreground">
                        <span>Set</span><span>kg (blank = body)</span><span>Reps</span><span />
                      </div>
                      {e.rows.map((r, k) => (
                        <div key={k} className={cn("grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2", r.done && "opacity-70")}>
                          <span className="text-center text-sm font-semibold tabular-nums">{k + 1}</span>
                          <Input
                            inputMode="decimal"
                            value={r.weight}
                            placeholder="–"
                            aria-label={`${e.name} set ${k + 1} weight in kg`}
                            onChange={(ev) => update(i, (x) => ({ ...x, rows: x.rows.map((y, n) => (n === k ? { ...y, weight: ev.target.value.replace(/[^\d.]/g, "") } : y)) }))}
                            className="h-11 text-center text-base tabular-nums"
                          />
                          <Input
                            inputMode="numeric"
                            value={r.reps}
                            aria-label={`${e.name} set ${k + 1} reps`}
                            onChange={(ev) => update(i, (x) => ({ ...x, rows: x.rows.map((y, n) => (n === k ? { ...y, reps: ev.target.value.replace(/\D/g, "") } : y)) }))}
                            className="h-11 text-center text-base tabular-nums"
                          />
                          <button
                            type="button"
                            aria-pressed={r.done}
                            aria-label={`Set ${k + 1} done`}
                            onClick={() => update(i, (x) => ({ ...x, rows: x.rows.map((y, n) => (n === k ? { ...y, done: !y.done } : y)) }))}
                            className={cn(
                              "flex h-11 w-11 items-center justify-center rounded-xl border transition-colors",
                              r.done ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                            )}
                            data-testid="button-set-done"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => update(i, (x) => ({ ...x, rows: [...x.rows, { ...(x.rows.at(-1) ?? { weight: "", reps: "" }), done: false }] }))}>
                          <Plus className="h-3.5 w-3.5" /> Set
                        </Button>
                        {e.rows.length > 1 && (
                          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => update(i, (x) => ({ ...x, rows: x.rows.slice(0, -1) }))}>
                            <Minus className="h-3.5 w-3.5" /> Set
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-pressed={e.timedDone}
                      onClick={() => update(i, (x) => ({ ...x, timedDone: !x.timedDone }))}
                      className={cn(
                        "mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors",
                        e.timedDone ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      <Check className="h-4 w-4" /> {e.timedDone ? "Done" : "Mark done"}
                    </button>
                  )}
                </section>
              );
            })
          )}
        </div>

        <div className="border-t px-5 py-4">
          <Button className="h-12 w-full text-base" disabled={!anything || save.isPending} onClick={() => void finish()} data-testid="button-finish-session">
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {anything ? `Finish session${doneSets ? ` · ${doneSets} sets` : ""}` : "Tick a set to finish"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
