/** The "hardest to resist" habits. One daily tick-box covers all the ones picked. */
export const HABIT_OPTIONS = [
  { value: "sweets and biscuits", label: "Sweets and biscuits", emoji: "🍪" },
  { value: "sugary drinks", label: "Sugary drinks", emoji: "🥤" },
  { value: "fried snacks", label: "Fried snacks", emoji: "🍟" },
  { value: "late-night snacks", label: "Late-night eating", emoji: "🌙" },
  { value: "alcohol", label: "Alcohol", emoji: "🍺" },
] as const;

/** ["sugary drinks", "chin chin"] → "sugary drinks and chin chin" (what's saved as the guilty pleasure). */
export function composeHabits(list: string[]): string | null {
  const items = list.map((s) => s.trim()).filter(Boolean);
  if (!items.length) return null;
  const text = items.length === 1 ? items[0] : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
  return text.slice(0, 80);
}

/** The saved text back into picked options plus anything typed ("other"). */
export function parseHabits(text: string | null | undefined): { picked: string[]; other: string } {
  const parts = (text ?? "").split(/,\s*|\s+and\s+/).map((s) => s.trim()).filter(Boolean);
  const known = new Set<string>(HABIT_OPTIONS.map((h) => h.value));
  const picked = parts.filter((p) => known.has(p.toLowerCase())).map((p) => p.toLowerCase());
  const other = parts.filter((p) => !known.has(p.toLowerCase())).join(", ");
  return { picked, other };
}
