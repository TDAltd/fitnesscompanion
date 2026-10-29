/**
 * Daily rotation: the same order all day (so lists don't jump around while you use them),
 * a different order tomorrow. Seeded by the local date plus a label for each list.
 */
function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const localToday = () => new Date().toLocaleDateString("en-CA");

export function dailyShuffle<T>(items: readonly T[], label: string, date = localToday()): T[] {
  const rand = seededRandom(`${date}:${label}`);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
