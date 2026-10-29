import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Low days must never look like success. After 7 PM today with under half the target logged,
 * or a past day under the safe minimum, ask whether meals were missed.
 */
export function lowIntakeMessage({
  calories,
  target,
  floor,
  isToday,
  hour = new Date().getHours(),
  habitFocus = false,
}: {
  calories: number;
  target: number;
  floor: number;
  isToday: boolean;
  hour?: number;
  habitFocus?: boolean;
}): string | null {
  if (!target) return null;
  if (isToday) {
    if (hour < 19 || calories >= target * 0.5) return null;
    if (habitFocus) return calories ? "Have you had enough to eat today? If you've eaten more, add it so your day is complete." : "Nothing logged yet today. Have you eaten? Add your meals when you can.";
    return calories
      ? `Only ${calories.toLocaleString()} kcal logged today. Forgot to add something? Eating too little makes weight loss harder, not easier.`
      : "Nothing logged today yet. Forgot to add your meals?";
  }
  if (calories > 0 && calories < floor) {
    return habitFocus
      ? "This day looks light. If you ate more, add it."
      : `This day looks very low (${calories.toLocaleString()} kcal). If you missed meals, add them. If not, it's below the safe minimum of ${floor.toLocaleString()} kcal.`;
  }
  return null;
}

export function LowIntakeNote({ message, onAdd }: { message: string | null; onAdd?: () => void }) {
  if (!message) return null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dusk/30 bg-dusk/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between" role="status" data-testid="low-intake-note">
      <p className="flex gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-dusk" />
        {message}
      </p>
      {onAdd && (
        <Button size="sm" variant="outline" className="shrink-0" onClick={onAdd}>
          Log a meal
        </Button>
      )}
    </div>
  );
}
