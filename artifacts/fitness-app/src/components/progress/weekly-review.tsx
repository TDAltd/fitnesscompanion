import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Droplets, Dumbbell, Footprints, Loader2, Scale, Share2, ShieldCheck, Sparkles, Utensils } from "lucide-react";
import { getGetProfileQueryKey, useGetProfile } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { withBase } from "@/lib/base-path";
import { cn } from "@/lib/utils";

type Period = {
  from: string;
  to: string;
  days: number;
  workouts: { done: number; planned: number };
  food: { days: number; onTarget: number | null; low: number };
  steps: { avg: number | null; goal: number; daysMet: number };
  water: { daysMet: number };
  habit: { label: string; days: number };
};
type Review = {
  week: string;
  from: string;
  to: string;
  partial: boolean;
  habitFocus: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  current: Period;
  previous: Period | null;
  weight: { start: number; end: number; change: number } | null;
  milestones: { icon: string; title: string }[];
  focus: string;
};

async function fetchReview(week: string | null): Promise<Review> {
  const res = await fetch(withBase(`/api/weekly-review${week ? `?week=${week}` : ""}`), { credentials: "same-origin" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "Couldn't load your week.");
  return data as Review;
}

const range = (from: string, to: string) => {
  const a = parseISO(from);
  const b = parseISO(to);
  return a.getMonth() === b.getMonth() ? `${format(a, "d")}–${format(b, "d MMM")}` : `${format(a, "d MMM")} – ${format(b, "d MMM")}`;
};

type Row = { key: string; icon: React.ReactNode; label: string; value: string; delta: number | null; unit?: string; share?: boolean };

function rows(r: Review): Row[] {
  const c = r.current;
  const p = r.previous;
  const out: Row[] = [
    {
      key: "workouts",
      icon: <Dumbbell className="h-4 w-4" />,
      label: "Workouts",
      value: c.workouts.planned ? `${c.workouts.done} of ${c.workouts.planned}` : `${c.workouts.done}`,
      delta: p ? c.workouts.done - p.workouts.done : null,
      share: true,
    },
    {
      key: "food",
      icon: <Utensils className="h-4 w-4" />,
      label: "Food logged",
      value: `${c.food.days} of ${c.days} days${c.food.onTarget != null && c.food.days ? ` · ${c.food.onTarget} on target` : ""}`,
      delta: p ? c.food.days - p.food.days : null,
      share: true,
    },
    {
      key: "steps",
      icon: <Footprints className="h-4 w-4" />,
      label: "Average steps",
      value: c.steps.avg != null ? `${c.steps.avg.toLocaleString()} (goal ${c.steps.goal.toLocaleString()})` : "Not recorded",
      delta: p && c.steps.avg != null && p.steps.avg != null ? c.steps.avg - p.steps.avg : null,
      share: true,
    },
    {
      key: "water",
      icon: <Droplets className="h-4 w-4" />,
      label: "Water goal",
      value: `${c.water.daysMet} of ${c.days} days`,
      delta: p ? c.water.daysMet - p.water.daysMet : null,
      share: true,
    },
    {
      key: "habit",
      icon: <ShieldCheck className="h-4 w-4" />,
      label: c.habit.label,
      value: `${c.habit.days} of ${c.days} days`,
      delta: p ? c.habit.days - p.habit.days : null,
      share: true,
    },
  ];
  if (r.weight) {
    out.push({
      key: "weight",
      icon: <Scale className="h-4 w-4" />,
      label: "Weight",
      value: `${r.weight.change > 0 ? "+" : ""}${r.weight.change} kg (now ${r.weight.end} kg)`,
      delta: null,
      share: false, // private: never on the share image
    });
  }
  return out;
}

function Delta({ n }: { n: number | null }) {
  if (n == null || n === 0) return null;
  const up = n > 0;
  const shown = Math.abs(n) >= 1000 ? Math.abs(n).toLocaleString() : Math.abs(n);
  return (
    <span className={cn("ml-2 inline-flex items-center text-xs font-semibold", up ? "text-primary" : "text-muted-foreground")} title="Compared with the same days last week">
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {shown}
    </span>
  );
}

/** Progress: last week's review (or this week so far), compared with the week before, plus one focus. */
export function WeeklyReview() {
  const [week, setWeek] = useState<string | null>(null);
  const { data: r, isLoading, isFetching, error } = useQuery({ queryKey: ["weekly-review", week], queryFn: () => fetchReview(week), placeholderData: (prev) => prev });
  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const { toast } = useToast();
  const [sharing, setSharing] = useState(false);

  if (isLoading) return <Skeleton className="h-72 w-full rounded-3xl" />;
  if (error || !r) return null;

  const shift = (days: number) => {
    const d = parseISO(r.week);
    d.setDate(d.getDate() + days);
    setWeek(format(d, "yyyy-MM-dd"));
  };
  const list = rows(r);
  const title = r.partial ? "This week so far" : r.canGoForward && shiftIsLastWeek(r.week) ? "Last week" : `Week of ${format(parseISO(r.week), "d MMM")}`;

  const share = async () => {
    setSharing(true);
    try {
      const file = await reviewCard(r, title, profile?.name);
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text: `My week in Fitness Companion` }).catch(() => undefined);
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = `week-${r.week}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast({ title: "Image saved", description: "Your weight isn't included." });
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Card className="overflow-hidden" data-testid="weekly-review">
      <div className="flex items-center gap-2 border-b bg-primary/5 px-3 py-2">
        <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Earlier week" disabled={!r.canGoBack || isFetching} onClick={() => shift(-7)} data-testid="button-week-back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="font-display text-lg font-medium leading-tight" data-testid="text-review-title">{title}</p>
          <p className="text-xs text-muted-foreground">{range(r.from, r.to)}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Later week" disabled={!r.canGoForward || isFetching} onClick={() => shift(7)} data-testid="button-week-forward">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
      <CardContent className="space-y-4 p-5">
        {isFetching && <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />}
        <ul className="space-y-2.5">
          {list.map((row) => (
            <li key={row.key} className="flex items-center gap-3 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{row.icon}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{row.label}</span>
              <span className="shrink-0 text-right font-semibold tabular-nums" data-testid={`review-${row.key}`}>
                {row.value}
                <Delta n={row.delta} />
              </span>
            </li>
          ))}
        </ul>
        {r.milestones.length > 0 && (
          <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
            <span className="font-semibold">Milestones: </span>
            {r.milestones.map((m) => `${m.icon} ${m.title}`).join(", ")}
          </p>
        )}
        <div className="flex gap-3 rounded-2xl bg-primary/10 p-4" data-testid="review-focus">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-bold text-primary">{r.partial ? "Focus for the rest of the week" : "Focus for next week"}</p>
            <p className="mt-0.5 text-sm">{r.focus}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{r.previous ? "Arrows compare with the same days the week before." : ""}</p>
          <Button variant="outline" className="h-10 shrink-0 gap-2" onClick={() => void share()} disabled={sharing} data-testid="button-share-week">
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** True when this Monday is exactly one week before this week's Monday. */
function shiftIsLastWeek(week: string) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setDate(monday.getDate() - 7);
  return format(monday, "yyyy-MM-dd") === week;
}

/** Portrait share image (1080×1350). Weight is never on it. */
async function reviewCard(r: Review, title: string, name?: string | null): Promise<File> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#173A33");
  grad.addColorStop(1, "#2E7D6B");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(207,230,219,0.12)";
  g.lineWidth = 26;
  g.beginPath();
  g.arc(W - 120, 160, 260, 0, Math.PI * 2);
  g.stroke();

  g.textAlign = "left";
  g.fillStyle = "#CFE6DB";
  g.font = "600 40px 'Nunito Sans', system-ui, sans-serif";
  g.fillText(range(r.from, r.to).toUpperCase(), 90, 170);
  g.fillStyle = "#F2F6F4";
  g.font = "600 88px Lexend, system-ui, sans-serif";
  g.fillText(title === "This week so far" ? "My week so far" : "My week", 90, 270);

  let y = 420;
  for (const row of rows(r).filter((x) => x.share)) {
    g.fillStyle = "rgba(242,246,244,0.08)";
    roundRect(g, 70, y - 70, W - 140, 120, 28);
    g.fill();
    g.fillStyle = "#CFE6DB";
    g.font = "400 38px 'Nunito Sans', system-ui, sans-serif";
    g.fillText(row.label.length > 22 ? `${row.label.slice(0, 21)}…` : row.label, 110, y + 4);
    g.fillStyle = "#F2F6F4";
    g.font = "700 44px 'Nunito Sans', system-ui, sans-serif";
    g.textAlign = "right";
    g.fillText(row.value.split(" (")[0].split(" · ")[0], W - 110, y + 6);
    g.textAlign = "left";
    y += 150;
  }
  if (r.milestones.length) {
    g.fillStyle = "#F2F6F4";
    g.font = "400 40px system-ui, 'Apple Color Emoji', sans-serif";
    g.fillText(r.milestones.slice(0, 3).map((m) => m.icon).join("  ") + "  milestones reached", 90, y + 10);
  }
  g.textAlign = "center";
  g.fillStyle = "rgba(242,246,244,0.85)";
  g.font = "600 34px 'Nunito Sans', system-ui, sans-serif";
  g.fillText(name ? `${name} · Fitness Companion` : "Fitness Companion", W / 2, H - 70);
  const blob = await new Promise<Blob>((resolve) => c.toBlob((b) => resolve(b!), "image/png"));
  return new File([blob], `my-week.png`, { type: "image/png" });
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
