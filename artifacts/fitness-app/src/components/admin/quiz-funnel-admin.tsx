import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { withBase } from "@/lib/base-path";
import { cn } from "@/lib/utils";

type Step = { id: string; label: string; some?: boolean; reached: number; percent: number; lost: number | null };
type Funnel = { days: number; started: number; finished: number; steps: Step[] };

export function QuizFunnelAdmin() {
  const [days, setDays] = useState(30);
  const { data } = useQuery({
    queryKey: ["admin-quiz-funnel", days],
    queryFn: async () => {
      const res = await fetch(withBase(`/api/admin/quiz-funnel?days=${days}`), { credentials: "same-origin" });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      return (await res.json()) as Funnel;
    },
  });
  const worst = data?.steps.filter((s) => s.lost != null && s.lost > 0).sort((a, b) => (b.lost ?? 0) - (a.lost ?? 0))[0];
  const rate = data && data.started ? Math.round((data.finished / data.started) * 100) : 0;

  return (
    <Card data-testid="quiz-funnel-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" /> Sign-up questions: where people stop
        </CardTitle>
        <CardDescription>Everyone who opened the first screen, and how far they got. Counted per phone, without their answers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", days === d ? "border-primary bg-primary text-primary-foreground" : "bg-card")}
            >
              {d} days
            </button>
          ))}
        </div>

        {!data ? null : data.started === 0 ? (
          <p className="rounded-xl bg-muted/50 p-3 text-muted-foreground">No one has opened the sign-up questions in this period yet. Counting started with this update.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Started" value={data.started} />
              <Stat label="Created an account" value={data.finished} />
              <Stat label="Finished" value={`${rate}%`} />
            </div>
            {worst && (
              <p className="rounded-xl bg-amber-100/70 p-3">
                <b>Most people stop at: {worst.label}.</b> {worst.lost} {worst.lost === 1 ? "person" : "people"} ({Math.round(((worst.lost ?? 0) / data.started) * 100)}% of everyone who started) saw this screen and didn't go on. Start there.
              </p>
            )}
            <ol className="space-y-1.5">
              {data.steps.map((s) => (
                <li key={s.id} className={cn("grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-2", s.some && "opacity-70")}>
                  <span className="truncate text-xs">
                    {s.label}
                    {s.some && <span className="text-muted-foreground"> (some)</span>}
                  </span>
                  <span className="h-3 overflow-hidden rounded-full bg-muted">
                    <span className={cn("block h-full rounded-full", s.id === worst?.id ? "bg-amber-500" : "bg-primary")} style={{ width: `${s.percent}%` }} />
                  </span>
                  <span className="w-24 text-right text-xs tabular-nums">
                    {s.reached} · {s.percent}%
                    {s.lost ? <span className="text-destructive" title="Left on this screen"> −{s.lost}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">Red numbers = people who left on that screen. "(some)" screens only appear for some answers (for example equipment isn't asked of gym-goers), so leaving on them is counted on the screen before.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-2">
      <p className="font-display text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
