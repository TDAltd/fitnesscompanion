import { useSyncExternalStore } from "react";

/**
 * Logging without a connection.
 *
 * Food (typed or picked, not AI), habit ticks and weight are saved on this phone when the network
 * is down, answered with a stand-in reply so the screen carries on, and sent in order as soon as
 * the connection is back. Each queued entry has an id the server uses to ignore a double send.
 */
export type QueuedKind = "food" | "habit" | "weight";
export type Queued = {
  id: string;
  kind: QueuedKind;
  path: string; // e.g. /api/food-log (without the hosting folder)
  body: Record<string, unknown>;
  timezone: string;
  createdAt: string;
};

const KEY = "fc-offline-queue";
const ROUTES: Record<string, QueuedKind> = { "/api/food-log": "food", "/api/habits": "habit", "/api/weight": "weight" };

let queue: Queued[] = load();
const listeners = new Set<() => void>();
let online = typeof navigator === "undefined" ? true : navigator.onLine;

function load(): Queued[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    /* storage full or blocked: the queue still lives in memory for this visit */
  }
  listeners.forEach((l) => l());
}
const emit = () => listeners.forEach((l) => l());

export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const getQueue = () => queue;
export const isOnline = () => online;

export function useOfflineQueue() {
  const q = useSyncExternalStore(subscribe, getQueue, getQueue);
  const on = useSyncExternalStore(subscribe, isOnline, isOnline);
  return { queue: q, online: on };
}

/** Entries waiting to be sent for one day of the food diary, shaped like saved ones. */
export function pendingFoods(q: Queued[], date: string) {
  return q
    .filter((x) => x.kind === "food" && x.body.date === date)
    .map((x, i) => standIn(x, -(i + 1)) as Record<string, unknown>);
}

const localDay = (tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz || undefined }).format(new Date());

/** Which queueable route, if any, a request is for. */
export function queueKind(url: string, method: string, base: string): { kind: QueuedKind; path: string } | null {
  if (method.toUpperCase() !== "POST") return null;
  let path: string;
  try {
    path = new URL(url, window.location.origin).pathname;
  } catch {
    return null;
  }
  if (base && path.startsWith(base)) path = path.slice(base.length);
  const kind = ROUTES[path];
  return kind ? { kind, path } : null;
}

export function enqueue(kind: QueuedKind, path: string, rawBody: unknown, timezone: string): Queued {
  let body: Record<string, unknown> = {};
  try {
    body = typeof rawBody === "string" ? JSON.parse(rawBody) : {};
  } catch {
    /* not JSON: send as-is (empty) */
  }
  // Fix the day and time now, not when it's finally sent
  if (kind === "food" && !body.date) body.date = localDay(timezone);
  if (kind === "weight" && !body.loggedAt) body.loggedAt = new Date().toISOString();
  const item: Queued = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind,
    path,
    body,
    timezone,
    createdAt: new Date().toISOString(),
  };
  queue = [...queue, item];
  online = false;
  save();
  return item;
}

/** A reply shaped like the server's, so the screen that logged it carries on normally. */
export function standIn(item: Queued, id = -Date.now()) {
  const b = item.body;
  if (item.kind === "food") {
    const s = Number(b.servings ?? 1) || 1;
    const n = (k: string) => Math.round((Number(b[k] ?? 0) || 0) * s);
    return { id, date: b.date, slot: b.slot, name: b.name, servings: s, calories: n("calories"), protein: n("protein"), carbs: n("carbs"), fat: n("fat"), pending: true };
  }
  if (item.kind === "weight") return { id, weightKg: b.weightKg, notes: b.notes ?? null, loggedAt: b.loggedAt, pending: true };
  return { id, stepsGoal: 0, waterGoalLitres: 0, stepsDone: 0, waterDoneLitres: 0, biscuitsAvoided: false, ...b, pending: true };
}

let flushing: Promise<number> | null = null;

/**
 * Send what's waiting, oldest first. Stops at the first network failure (still offline).
 * Returns how many were delivered.
 */
export function flush(send: (item: Queued) => Promise<Response>, onRejected?: (item: Queued, status: number) => void): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    let sent = 0;
    while (queue.length) {
      const item = queue[0];
      let res: Response;
      try {
        res = await send(item);
      } catch {
        online = false;
        emit();
        break;
      }
      if (res.status === 401) break; // logged out: keep them for when they log back in
      if (res.status >= 500) break; // server trouble: try again later
      online = true;
      if (!res.ok) onRejected?.(item, res.status);
      else sent++;
      queue = queue.filter((x) => x.id !== item.id);
      save();
    }
    if (!queue.length) {
      online = true;
      emit();
    }
    return sent;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

export function setOnline(v: boolean) {
  if (online !== v) {
    online = v;
    emit();
  }
}

export function clearQueue() {
  queue = [];
  save();
}
