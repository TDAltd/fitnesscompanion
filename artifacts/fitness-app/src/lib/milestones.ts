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
export async function milestoneCard(m: Pick<Milestone, "title" | "line" | "icon">, name?: string | null): Promise<File> {
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
  g.strokeStyle = "rgba(207,230,219,0.18)";
  g.lineWidth = 28;
  for (const r of [300, 420]) {
    g.beginPath();
    g.arc(size / 2, 420, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.textAlign = "center";
  g.font = "180px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
  g.fillText(m.icon, size / 2, 480);
  g.fillStyle = "#F2F6F4";
  g.font = "600 76px Lexend, system-ui, sans-serif";
  wrap(g, m.title, size / 2, 680, 900, 88);
  g.fillStyle = "#CFE6DB";
  g.font = "400 40px 'Nunito Sans', system-ui, sans-serif";
  wrap(g, m.line, size / 2, 800, 860, 54);
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
