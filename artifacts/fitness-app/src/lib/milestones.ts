import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { withBase } from "./base-path";

export type MilestoneGroup = "habit" | "training" | "body" | "loyalty";
export type Milestone = {
  key: string;
  group: MilestoneGroup;
  title: string;
  line: string;
  icon: string;
  unit: string;
  earned: boolean;
  earnedAt: string | null;
  seen: boolean;
  progress: { current: number; target: number };
};

export const GROUP_LABELS: Record<MilestoneGroup, string> = {
  habit: "Habits",
  training: "Training",
  body: "Body",
  loyalty: "Showing up",
};

const KEY = ["milestones"] as const;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBase(path), { credentials: "same-origin", headers: { "content-type": "application/json" }, ...init });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error((data && data.error) || `Request failed (${res.status})`), { status: res.status });
  return data as T;
}

export const useMilestones = () =>
  useQuery({
    queryKey: KEY,
    queryFn: () => api<{ milestones: Milestone[]; unseen: string[] }>("/api/milestones"),
    staleTime: 30_000,
  });

export function useMarkSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keys: string[]) => api("/api/milestones/seen", { method: "POST", body: JSON.stringify({ keys }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Draws a square share card (1080×1080) and returns it as a PNG file. */
export async function milestoneCard(m: Pick<Milestone, "title" | "line" | "icon" | "key" | "group">, name?: string | null): Promise<File> {
  const size = 1080;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#173A33");
  grad.addColorStop(1, "#2E7D6B");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  // soft rings, echoing the app's "daily rhythm" logo
  g.strokeStyle = "rgba(207,230,219,0.14)";
  g.lineWidth = 24;
  for (const r of [330, 440]) {
    g.beginPath();
    g.arc(size / 2, 400, r, 0, Math.PI * 2);
    g.stroke();
  }
  // The medal: rim in the level's colours, inside in the area's colour
  const tier = tierOf(m);
  const [light, dark] = TIER_COLORS[tier];
  const cx = size / 2;
  const cy = 400;
  g.save();
  g.shadowColor = "rgba(0,0,0,0.35)";
  g.shadowBlur = 40;
  g.shadowOffsetY = 16;
  const rim = g.createLinearGradient(cx - 220, cy - 220, cx + 220, cy + 220);
  rim.addColorStop(0, light);
  if (tier === "legend") rim.addColorStop(0.5, "#F6D365");
  rim.addColorStop(1, dark);
  g.fillStyle = rim;
  g.beginPath();
  g.arc(cx, cy, 220, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.fillStyle = GROUP_COLORS[m.group];
  g.beginPath();
  g.arc(cx, cy, 182, 0, Math.PI * 2);
  g.fill();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "170px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
  g.fillText(m.icon, cx, cy + 8);
  g.textBaseline = "alphabetic";
  g.fillStyle = light;
  g.font = "700 30px 'Nunito Sans', system-ui, sans-serif";
  g.fillText(`${TIER_LABEL[tier].toUpperCase()} MILESTONE`, cx, 690);
  g.fillStyle = "#F2F6F4";
  g.font = "600 76px Lexend, system-ui, sans-serif";
  wrap(g, m.title, size / 2, 780, 900, 84);
  g.fillStyle = "#CFE6DB";
  g.font = "400 40px 'Nunito Sans', system-ui, sans-serif";
  wrap(g, m.line, size / 2, 870, 860, 52);
  g.fillStyle = "rgba(242,246,244,0.85)";
  g.font = "600 34px 'Nunito Sans', system-ui, sans-serif";
  g.fillText(name ? `${name} · Fitness Companion` : "Fitness Companion", size / 2, size - 70);
  const blob = await new Promise<Blob>((resolve) => c.toBlob((b) => resolve(b!), "image/png"));
  return new File([blob], "milestone.png", { type: "image/png" });
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > max && line) {
      g.fillText(line, x, y);
      line = w;
      y += lh;
    } else line = test;
  }
  g.fillText(line, x, y);
}

/** Share with the phone's share sheet (WhatsApp, Instagram...), or download where that isn't available. */
export async function shareMilestone(m: Milestone, name?: string | null): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = await milestoneCard(m, name);
  const text = `${m.icon} ${m.title}: ${m.line}`;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${m.key}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "downloaded";
}

// ---------- medal levels ----------
export type Tier = "bronze" | "silver" | "gold" | "legend";
export const TIER_LABEL: Record<Tier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold", legend: "Legend" };

/** How big a milestone is: firsts are bronze, the long hauls are legend. */
export function tierOf(m: Pick<Milestone, "key">): Tier {
  const k = m.key;
  const n = Number(k.match(/(\d+)/)?.[1] ?? 1);
  const pick = (silver: number, gold: number, legend: number): Tier => (n >= legend ? "legend" : n >= gold ? "gold" : n >= silver ? "silver" : "bronze");
  if (k === "goal-reached") return "legend";
  if (k === "halfway") return "gold";
  if (k.startsWith("days-logged-")) return pick(14, 60, 200);
  if (k.startsWith("workouts-")) return pick(10, 25, 100);
  if (k.startsWith("full-week-")) return pick(4, 12, 26);
  if (k.startsWith("personal-best-")) return pick(5, 10, 50);
  if (k.startsWith("lost-")) return pick(6, 10, 20);
  if (k.startsWith("waist-")) return pick(5, 10, 20);
  if (k.startsWith("member-")) return pick(90, 182, 365);
  if (k.startsWith("check-ins-")) return pick(4, 12, 52);
  return "bronze"; // firsts and comebacks
}

/** Rim colours per level, shared by the badge and the share image. */
export const TIER_COLORS: Record<Tier, [string, string]> = {
  bronze: ["#E0A774", "#9A5F33"],
  silver: ["#F2F4F6", "#98A3AD"],
  gold: ["#FBE08A", "#C8961E"],
  legend: ["#B9A7F5", "#2E7D6B"],
};
/** Inner colour per area. */
export const GROUP_COLORS: Record<MilestoneGroup, string> = {
  habit: "#E3F1EA",
  training: "#ECE8FB",
  body: "#E2EEF8",
  loyalty: "#FBF1DC",
};
