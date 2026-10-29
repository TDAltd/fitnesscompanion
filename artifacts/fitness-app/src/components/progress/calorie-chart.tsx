import { useMemo } from "react";
import { format, parseISO, subDays } from "date-fns";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getGetProfileQueryKey, useGetProfile } from "@workspace/api-client-react";
import { calorieFloor } from "@workspace/plan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlan } from "@/lib/plan";
import { targetFor, useFoodTotals, useTreats } from "@/lib/food-log";
import { caloriesMet } from "@/lib/day-score";

const DAYS = 30;

/** Last 30 days of calories against the target. Days with nothing logged are left empty, not drawn as 0. */
export function CalorieChart() {
  const { plan } = usePlan();
  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const to = format(new Date(), "yyyy-MM-dd");
  const from = format(subDays(new Date(), DAYS - 1), "yyyy-MM-dd");
  const { data: totals } = useFoodTotals(from, to);
  const { data: treats } = useTreats(from, to);

  const { rows, stats } = useMemo(() => {
    const byDate = new Map((totals ?? []).map((t) => [t.date, t.calories]));
    const base = plan?.targets.calories ?? 0;
    const floor = calorieFloor(profile?.sex);
    const rows = Array.from({ length: DAYS }, (_, i) => {
      const date = format(subDays(new Date(), DAYS - 1 - i), "yyyy-MM-dd");
      const kcal = byDate.get(date) ?? null;
      const target = targetFor(date, base, treats);
      const status = kcal == null ? "none" : kcal < floor ? "low" : caloriesMet(kcal, target, plan?.targets.habitFocus) ? "met" : kcal > target ? "over" : "under";
      return { date, label: format(parseISO(date), "d MMM"), kcal, target, status };
    });
    const logged = rows.filter((r) => r.kcal != null);
    const avg = logged.length ? Math.round(logged.reduce((t, r) => t + (r.kcal ?? 0), 0) / logged.length) : null;
    return {
      rows,
      stats: {
        logged: logged.length,
        onTarget: logged.filter((r) => r.status === "met").length,
        low: logged.filter((r) => r.status === "low").length,
        avg,
      },
    };
  }, [totals, treats, plan, profile?.sex]);

  if (!plan) return null;
  const color = { met: "hsl(var(--primary))", under: "hsl(var(--primary) / 0.45)", over: "hsl(var(--destructive) / 0.75)", low: "hsl(var(--dusk))", none: "transparent" } as const;

  return (
    <Card data-testid="calorie-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Calories, last 30 days</CardTitle>
        <CardDescription>
          {stats.logged
            ? `Logged ${stats.logged} of 30 days · average ${stats.avg?.toLocaleString()} kcal on logged days · ${stats.onTarget} on target`
            : "Log food on Eat to see your month here."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={6} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={44} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                formatter={(v) => [v == null ? "Not logged" : `${Number(v).toLocaleString()} kcal`, "Eaten"]}
                labelFormatter={(l) => String(l)}
              />
              <ReferenceLine y={plan.targets.calories} stroke="hsl(var(--foreground) / 0.5)" strokeDasharray="4 4" label={{ value: "Target", position: "insideTopRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Bar dataKey="kcal" radius={[3, 3, 0, 0]} maxBarSize={14}>
                {rows.map((r) => (
                  <Cell key={r.date} fill={color[r.status as keyof typeof color]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Legend c={color.met} label="On target" />
          <Legend c={color.under} label="Under target" />
          <Legend c={color.over} label="Over target" />
          <Legend c={color.low} label="Very low: missed a meal?" />
          <span>Empty = not logged</span>
        </div>
        {stats.low > 0 && (
          <p className="mt-3 rounded-lg bg-dusk/10 px-3 py-2 text-sm">
            {stats.low} day{stats.low === 1 ? " was" : "s were"} below the safe minimum. If meals are missing, add them on Eat so your numbers are right.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Legend({ c, label }: { c: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
      {label}
    </span>
  );
}
