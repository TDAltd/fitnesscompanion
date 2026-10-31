import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { withBase } from "./base-path";

export type ReminderSettings = {
  water: boolean;
  workout: boolean;
  meals: boolean;
  weighIn: boolean;
  wakeTime: string;
  bedTime: string;
  workoutTime: string;
  weighInDay: number;
  devices: number;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBase(path), { credentials: "same-origin", headers: { "content-type": "application/json" }, ...init });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data as T;
}

export const useReminderSettings = () => useQuery({ queryKey: ["reminder-settings"], queryFn: () => api<ReminderSettings>("/api/reminders/settings") });

export function useSaveReminderSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<ReminderSettings>) => api<ReminderSettings>("/api/reminders/settings", { method: "PUT", body: JSON.stringify(patch) }),
    onSuccess: (data) => qc.setQueryData(["reminder-settings"], data),
  });
}

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua) || isIOS()) return "iPad";
  if (/Android/.test(ua)) return "Android phone";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows computer";
  return "This device";
}

function keyToBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const swUrl = () => withBase("/sw.js");
const swScope = () => withBase("/");

async function registration() {
  return navigator.serviceWorker.register(swUrl(), { scope: swScope() });
}

export type PushState = "unsupported" | "needs-home-screen" | "denied" | "off" | "on" | "loading";

/** This device's notification state, plus turn on / turn off. */
export function usePushDevice() {
  const qc = useQueryClient();
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!pushSupported()) {
      setState(isIOS() && !isStandalone() ? "needs-home-screen" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration(swScope());
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        // Make sure the server still has it (e.g. after signing in on a new account)
        await api("/api/push/subscribe", { method: "POST", body: JSON.stringify({ ...sub.toJSON(), device: deviceLabel() }) }).catch(() => undefined);
      }
      setState(sub ? "on" : "off");
    } catch {
      setState("off");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const turnOn = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const { key } = await api<{ key: string }>("/api/push/public-key");
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) }));
      await api("/api/push/subscribe", { method: "POST", body: JSON.stringify({ ...sub.toJSON(), device: deviceLabel() }) });
      setState("on");
      void qc.invalidateQueries({ queryKey: ["reminder-settings"] });
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration(swScope());
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => undefined);
        await sub.unsubscribe();
      }
      setState("off");
      void qc.invalidateQueries({ queryKey: ["reminder-settings"] });
    } finally {
      setBusy(false);
    }
  };

  const test = () => api<{ sent: number }>("/api/push/test", { method: "POST" });

  return { state, busy, turnOn, turnOff, test };
}
