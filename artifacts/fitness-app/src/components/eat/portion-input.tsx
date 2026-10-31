import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * "Other amount" box. Keeps its own text so you can clear it and type a new number
 * (a plain number input snaps back to the old value the moment it's empty).
 */
export function PortionInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    // Follow the chips, but don't overwrite what's being typed ("1." or "")
    if (Number(text.replace(",", ".")) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="mt-2 flex items-center gap-2 text-sm">
      <label htmlFor="portion-other" className="text-muted-foreground">Other amount:</label>
      <Input
        id="portion-other"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d.,]/g, "").slice(0, 5);
          setText(t);
          const n = Number(t.replace(",", "."));
          if (n > 0 && n <= 10) onChange(Math.round(n * 100) / 100);
        }}
        onBlur={() => setText(String(value))}
        className="h-11 w-24 text-center text-base tabular-nums"
        aria-label="Number of portions"
        data-testid="input-portions"
      />
      <span className="text-muted-foreground">portions (up to 10)</span>
    </div>
  );
}
