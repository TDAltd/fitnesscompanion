import {
  useListWeightLogs,
  getListWeightLogsQueryKey,
  useGetProfile,
  getGetProfileQueryKey,
} from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export function WeightChart() {
  const { data: logs, isLoading } = useListWeightLogs({
    query: { queryKey: getListWeightLogsQueryKey() }
  });
  const { data: profile } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() }
  });
  const goal = profile?.goalWeightKg ?? null;

  if (isLoading) {
    return <Skeleton className="h-full w-full" />;
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
        No weight data logged yet.
      </div>
    );
  }

  // Sort logs by date ascending
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  );

  const chartData = sortedLogs.map(log => ({
    date: format(parseISO(log.loggedAt), "MMM dd"),
    weight: log.weightKg,
    fullDate: format(parseISO(log.loggedAt), "MMM dd, yyyy HH:mm")
  }));

  // Find min/max for sensible Y axis
  const weights = sortedLogs.map(l => l.weightKg);
  const goalForAxis = goal != null ? [goal] : [];
  const minWeight = Math.min(...weights, ...goalForAxis); // Include goal in calc
  const maxWeight = Math.max(...weights, ...goalForAxis);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border shadow-lg p-3 rounded-lg text-sm">
          <p className="font-bold text-foreground mb-1">{payload[0].payload.fullDate}</p>
          <p className="text-primary font-semibold text-lg">
            {payload[0].value} kg
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          tickLine={false} 
          axisLine={false} 
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickMargin={10}
          minTickGap={20}
        />
        <YAxis 
          domain={[Math.max(0, Math.floor(minWeight - 2)), Math.ceil(maxWeight + 2)]} 
          tickLine={false} 
          axisLine={false}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(value) => `${value}kg`}
        />
        <Tooltip content={<CustomTooltip />} />
        
        {/* Goal Line */}
        {goal != null && (
          <ReferenceLine
            y={goal}
            label={{ position: 'insideTopLeft', value: `GOAL: ${goal}kg`, fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 'bold' }}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 5"
          />
        )}
        
        <Line 
          type="monotone" 
          dataKey="weight" 
          stroke="hsl(var(--primary))" 
          strokeWidth={3}
          dot={{ r: 4, fill: "hsl(var(--card))", stroke: "hsl(var(--primary))", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
