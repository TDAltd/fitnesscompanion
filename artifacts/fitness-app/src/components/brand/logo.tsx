import { cn } from "@/lib/utils";

/**
 * Fitness Companion mark ("Daily rhythm"): a nearly-closed ring for the day's progress
 * with a calm heartbeat running through it.
 */
export function LogoMark({ className, title = "Fitness Companion" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-9 w-9 shrink-0", className)} role="img" aria-label={title}>
      <rect width="64" height="64" rx="15" fill="#173A33" />
      <circle cx="32" cy="32" r="19" fill="none" stroke="#2E7D6B" strokeWidth="5" />
      <circle
        cx="32" cy="32" r="19" fill="none" stroke="#CFE6DB" strokeWidth="5" strokeLinecap="round"
        strokeDasharray="96 200" transform="rotate(-90 32 32)"
      />
      <path d="M17 33h8l3.5-7 6 14 3.5-7h9" fill="none" stroke="#8C82D4" strokeWidth="3.6"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, showTagline = false }: { className?: string; showTagline?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="leading-none">
        <span className="block font-display text-[17px] font-medium tracking-[-0.01em] text-foreground">
          Fitness Companion
        </span>
        {showTagline && <span className="mt-1 block text-xs text-muted-foreground">Your pace, your plan</span>}
      </span>
    </span>
  );
}
