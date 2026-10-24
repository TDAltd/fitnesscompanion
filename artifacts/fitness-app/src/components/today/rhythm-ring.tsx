import { useEffect, useState } from "react";

/**
 * The "daily rhythm" ring from the logo, used as the Today screen's centrepiece.
 * Fills clockwise from the top as the day's plan gets done; the heartbeat line pulses once on load.
 */
export function RhythmRing({ done, total, size = 196 }: { done: number; total: number; size?: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = 78;
  const circumference = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(pct);
      return;
    }
    const id = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
        <circle cx="100" cy="100" r={r} fill="none" stroke="hsl(var(--sage))" strokeWidth="16" />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(shown * circumference, shown > 0 ? 0.1 : 0)} ${circumference}`}
          transform="rotate(-90 100 100)"
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(.2,.7,.2,1)" }}
        />
        <path
          d="M64 132h20l7-13 11 25 7-12h27"
          fill="none"
          stroke="hsl(var(--dusk))"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
          className="rhythm-pulse"
        />
      </svg>
      <div className="absolute inset-x-0 top-[30%] text-center" role="img" aria-label={`${done} of ${total} done today`}>
        <span className="font-display text-[40px] font-medium leading-none tracking-[-0.03em]">
          {done}
          <span className="text-2xl text-muted-foreground">/{total}</span>
        </span>
      </div>
    </div>
  );
}
