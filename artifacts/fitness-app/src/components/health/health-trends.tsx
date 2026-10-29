import { format, parseISO, subDays } from "date-fns";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Footprints } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHealthDays } from "@/lib/health";
import { usePlan } from "@/lib/plan";

/** Progress page: steps for the last 14 days from Apple Health. Hidden until data exists. */
export function HealthTrends() {
  const { data: days } = useHealthDays(14);
  const { plan } = usePlan();
  if (!days || days.length === 0) return null;

  const byDate = new Map(days.map((d) => [d.date, d]));
  const rows = Array.from({ length: 14 }, (_, i) => {
    const date = format(subDays(new Date(), 13 - i), "yyyy-MM-dd");
    const d = byDate.get(date);
    return {
      label: format(parseISO(date), "d MMM"),
      steps: d?.steps ?? null,
    };
  });
  const stepsGoal = plan?.targets.steps ?? 8000;
  const tick = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };

  const chart = (key: "steps", color: string, target: number, unit: string) => (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} interval={1} />
          <YAxis tickLine={false} axisLine={false} tick={tick} />
          <Tooltip
            formatter={(v: number) => [v.toLocaleString(), "Steps"]}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <ReferenceLine y={target} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4"
            label={{ value: `${target.toLocaleString()}${unit}`, position: "insideTopRight", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <Bar dataKey={key} fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Steps</CardTitle>
        <CardDescription>Last 14 days, synced from your phone or watch</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <Footprints className="h-3.5 w-3.5" /> Steps a day
        </p>
        {chart("steps", "hsl(var(--primary) / 0.7)", stepsGoal, "")}
      </CardContent>
    </Card>
  );
}
