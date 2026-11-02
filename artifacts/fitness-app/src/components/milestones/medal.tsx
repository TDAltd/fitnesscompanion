import { cn } from "@/lib/utils";
import { GROUP_COLORS, TIER_COLORS, tierOf, type Milestone } from "@/lib/milestones";

/** A round medal: rim shows the level (bronze → legend), inside colour shows the area. */
export function Medal({ m, size = 72, shimmer, className }: { m: Pick<Milestone, "key" | "group" | "icon">; size?: number; shimmer?: boolean; className?: string }) {
  const tier = tierOf(m);
  const [light, dark] = TIER_COLORS[tier];
  const rim = Math.max(4, Math.round(size * 0.09));
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full", tier === "legend" && "medal-legend", className)}
      style={{
        width: size,
        height: size,
        padding: rim,
        background: tier === "legend" ? `conic-gradient(from 210deg, ${light}, #F6D365, ${dark}, #7FC8B0, ${light})` : `linear-gradient(145deg, ${light}, ${dark})`,
        boxShadow: `0 ${Math.round(size / 18)}px ${Math.round(size / 6)}px -${Math.round(size / 12)}px ${dark}88`,
      }}
      data-tier={tier}
      aria-hidden
    >
      <span
        className="flex h-full w-full items-center justify-center rounded-full"
        style={{ background: GROUP_COLORS[m.group], boxShadow: `inset 0 0 0 ${Math.max(1, Math.round(size / 36))}px ${dark}55`, fontSize: Math.round(size * 0.42) }}
      >
        {m.icon}
      </span>
      {shimmer && <span className="medal-shimmer pointer-events-none absolute inset-0 rounded-full" />}
    </span>
  );
}
