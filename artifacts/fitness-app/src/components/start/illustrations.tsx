/**
 * Small flat illustrations for the sign-up quiz cards. Drawn in the app's own colours so they
 * match light mode and never show a body shape (no "before/after" or "dream body" imagery).
 */
const P = "hsl(var(--primary))";
const SOFT = "hsl(var(--primary) / 0.14)";
const DUSK = "hsl(var(--dusk))";
const INK = "hsl(var(--foreground) / 0.78)";
const SKIN = "#C68B59";

/** A friendly stick figure. Points are [x, y] in a 72×72 box. */
function Figure({ head, body, arms, legs, color = INK }: { head: [number, number]; body: [number, number, number, number]; arms: number[][]; legs: number[][]; color?: string }) {
  return (
    <g stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <line x1={body[0]} y1={body[1]} x2={body[2]} y2={body[3]} />
      {arms.map((a, i) => <polyline key={`a${i}`} points={a.join(" ")} />)}
      {legs.map((l, i) => <polyline key={`l${i}`} points={l.join(" ")} />)}
      <circle cx={head[0]} cy={head[1]} r={5} fill={SKIN} stroke="none" />
    </g>
  );
}

const ART: Record<string, React.ReactNode> = {
  // ---- goals ----
  "Weight loss": (
    <>
      <rect x="14" y="30" width="44" height="30" rx="8" fill={SOFT} stroke={P} strokeWidth="2.5" />
      <path d="M24 42a12 12 0 0 1 24 0" fill="none" stroke={P} strokeWidth="2.5" />
      <line x1="36" y1="42" x2="42" y2="35" stroke={DUSK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="36" cy="42" r="2.5" fill={P} />
      <path d="M50 14v10m-4-4 4 4 4-4" stroke={P} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  "Build strength": (
    <>
      <rect x="10" y="26" width="8" height="20" rx="2.5" fill={P} />
      <rect x="18" y="29" width="6" height="14" rx="2" fill={DUSK} />
      <rect x="24" y="34" width="24" height="4" rx="2" fill={INK} />
      <rect x="48" y="29" width="6" height="14" rx="2" fill={DUSK} />
      <rect x="54" y="26" width="8" height="20" rx="2.5" fill={P} />
      <path d="M22 56h28" stroke={SOFT} strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  "Improve endurance": (
    <>
      <path d="M36 58S14 45 14 30a10 10 0 0 1 22-5 10 10 0 0 1 22 5c0 15-22 28-22 28Z" fill={SOFT} stroke={P} strokeWidth="2.5" strokeLinejoin="round" />
      <polyline points="18,38 28,38 32,30 38,46 42,36 54,36" fill="none" stroke={DUSK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  "General fitness": (
    <>
      <circle cx="54" cy="18" r="7" fill="#F2C14E" />
      <ellipse cx="36" cy="62" rx="20" ry="3" fill={SOFT} />
      <Figure head={[36, 18]} body={[36, 24, 36, 42]} arms={[[24, 14, 36, 28, 48, 14]]} legs={[[28, 60, 36, 42, 44, 60]]} />
    </>
  ),

  // ---- how active your day is ----
  Sedentary: (
    <>
      <rect x="30" y="34" width="32" height="4" rx="2" fill={INK} />
      <rect x="38" y="20" width="18" height="13" rx="2" fill={SOFT} stroke={P} strokeWidth="2.2" />
      <line x1="58" y1="38" x2="58" y2="60" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <rect x="10" y="40" width="16" height="4" rx="2" fill={DUSK} />
      <line x1="12" y1="44" x2="12" y2="60" stroke={DUSK} strokeWidth="3" strokeLinecap="round" />
      <Figure head={[18, 22]} body={[18, 28, 18, 40]} arms={[[18, 31, 28, 34, 34, 33]]} legs={[[18, 40, 28, 42, 28, 58]]} />
    </>
  ),
  "Lightly Active": (
    <>
      <ellipse cx="36" cy="62" rx="20" ry="3" fill={SOFT} />
      <Figure head={[36, 16]} body={[36, 22, 36, 40]} arms={[[28, 34, 36, 26, 43, 33]]} legs={[[30, 60, 36, 40, 42, 60]]} />
    </>
  ),
  "Moderately Active": (
    <>
      <ellipse cx="36" cy="62" rx="22" ry="3" fill={SOFT} />
      <rect x="44" y="34" width="12" height="13" rx="2.5" fill={P} />
      <path d="M47 34a3 3 0 0 1 6 0" stroke={P} strokeWidth="2" fill="none" />
      <Figure head={[32, 15]} body={[33, 21, 31, 39]} arms={[[24, 31, 33, 25, 46, 34]]} legs={[[22, 59, 31, 39, 42, 58]]} />
    </>
  ),
  "Very Active": (
    <>
      <ellipse cx="36" cy="62" rx="24" ry="3" fill={SOFT} />
      <path d="M8 24h10M6 32h10M10 40h8" stroke={P} strokeWidth="2.5" strokeLinecap="round" />
      <Figure head={[42, 14]} body={[40, 20, 34, 38]} arms={[[28, 22, 39, 25, 50, 30]]} legs={[[20, 50, 34, 38, 46, 46, 52, 58]]} />
    </>
  ),

  // ---- where you train ----
  Home: (
    <>
      <path d="M12 34 36 14l24 20" fill="none" stroke={P} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="18" y="32" width="36" height="26" rx="2" fill={SOFT} stroke={P} strokeWidth="2.5" />
      <rect x="31" y="42" width="10" height="16" rx="1.5" fill={DUSK} />
      <ellipse cx="36" cy="62" rx="22" ry="2.5" fill={SOFT} />
    </>
  ),
  Gym: (
    <>
      <line x1="16" y1="22" x2="16" y2="58" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <line x1="56" y1="22" x2="56" y2="58" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <line x1="10" y1="58" x2="22" y2="58" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="58" x2="62" y2="58" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <rect x="6" y="31" width="60" height="3.5" rx="1.75" fill={INK} />
      <rect x="9" y="22" width="6" height="22" rx="2" fill={P} />
      <rect x="57" y="22" width="6" height="22" rx="2" fill={P} />
      <rect x="20" y="25" width="4" height="16" rx="1.5" fill={DUSK} />
      <rect x="48" y="25" width="4" height="16" rx="1.5" fill={DUSK} />
      <ellipse cx="36" cy="62" rx="24" ry="2.5" fill={SOFT} />
    </>
  ),
  Outdoors: (
    <>
      <circle cx="54" cy="16" r="6" fill="#F2C14E" />
      <path d="M8 60c10-8 20-8 28 0s18 8 28 0" fill="none" stroke={SOFT} strokeWidth="5" strokeLinecap="round" />
      <path d="M24 46 34 22l10 24Z" fill={P} />
      <path d="M18 50 26 32l8 18Z" fill={DUSK} />
      <line x1="34" y1="46" x2="34" y2="54" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  Mixed: (
    <>
      <path d="M8 36 22 24l14 12" fill="none" stroke={P} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="12" y="35" width="20" height="18" rx="2" fill={SOFT} stroke={P} strokeWidth="2.2" />
      <path d="M44 48 52 26l8 22Z" fill={DUSK} />
      <line x1="52" y1="48" x2="52" y2="55" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="36" cy="60" rx="26" ry="2.5" fill={SOFT} />
    </>
  ),
};

export const hasIllustration = (id: string) => id in ART;

export function Illustration({ id, className }: { id: string; className?: string }) {
  const art = ART[id];
  if (!art) return null;
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden>
      {art}
    </svg>
  );
}
