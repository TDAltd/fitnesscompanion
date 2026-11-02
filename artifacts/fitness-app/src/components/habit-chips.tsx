import { useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { HABIT_OPTIONS, composeHabits, parseHabits } from "@/lib/habits";
import { cn } from "@/lib/utils";

/** Tap the habits that are hardest to resist (several allowed), or type your own. */
export function HabitChips({ value, onChange }: { value: string | null | undefined; onChange: (v: string) => void }) {
  // Controlled by the saved text, so it shows the right picks once the profile loads
  const { picked, other: savedOther } = parseHabits(value);
  const [typing, setTyping] = useState<string | null>(null);
  const other = typing ?? savedOther;
  const [otherOpen, setOtherOpen] = useState(false);
  const otherOn = otherOpen || Boolean(savedOther);
  const emit = (p: string[], on: boolean, o: string) => onChange(composeHabits([...p, ...(on ? [o] : [])]) ?? "");
  const toggle = (v: string) => emit(picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v], otherOn, other);
  const chip = (on: boolean) =>
    cn("flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium", on ? "border-primary bg-primary/10" : "hover:bg-muted");
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {HABIT_OPTIONS.map((h) => {
          const on = picked.includes(h.value);
          return (
            <button key={h.value} type="button" aria-pressed={on} onClick={() => toggle(h.value)} className={chip(on)} data-testid={`habit-${h.value}`}>
              <span aria-hidden>{h.emoji}</span>
              <span className="flex-1">{h.label}</span>
              {on && <Check className="h-4 w-4 text-primary" />}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={otherOn}
          onClick={() => {
            const on = !otherOn;
            setOtherOpen(on);
            if (!on) setTyping(null);
            emit(picked, on, other);
          }}
          className={chip(otherOn)}
          data-testid="habit-other"
        >
          <span aria-hidden>✏️</span>
          <span className="flex-1">Something else</span>
          {otherOn && <Check className="h-4 w-4 text-primary" />}
        </button>
      </div>
      {otherOn && (
        <Input
          value={other}
          maxLength={40}
          placeholder="e.g. chin chin, ice cream"
          autoComplete="off"
          onChange={(e) => {
            setTyping(e.target.value);
            emit(picked, true, e.target.value);
          }}
          data-testid="input-habit-other"
        />
      )}
    </div>
  );
}
