import { useState, useEffect, useRef, useCallback } from "react";
import { Droplets, Bell, BellOff, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "hydration_reminder";

interface HydrationSettings {
  enabled: boolean;
  intervalMins: number;
}

function loadSettings(): HydrationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: false, intervalMins: 30 };
}

function saveSettings(s: HydrationSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

const INTERVAL_OPTIONS = [
  { value: "15", label: "Every 15 min" },
  { value: "30", label: "Every 30 min" },
  { value: "45", label: "Every 45 min" },
  { value: "60", label: "Every 60 min" },
];

export function HydrationReminder() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<HydrationSettings>(loadSettings);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");
  const [nextReminderIn, setNextReminderIn] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextFireRef = useRef<number | null>(null);

  useEffect(() => {
    if ("Notification" in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  const sendReminder = useCallback(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("💧 Hydration Check!", {
        body: "Time to drink a glass of water. Stay hydrated!",
        icon: "/favicon.ico",
        tag: "hydration",
      });
    } else {
      toast({
        title: "💧 Time to drink water!",
        description: "Stay hydrated — drink a glass now.",
      });
    }
  }, [toast]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    timerRef.current = null;
    countdownRef.current = null;
    nextFireRef.current = null;
    setNextReminderIn(null);
  }, []);

  const startTimers = useCallback((intervalMins: number) => {
    clearTimers();
    const ms = intervalMins * 60 * 1000;
    nextFireRef.current = Date.now() + ms;

    timerRef.current = setInterval(() => {
      sendReminder();
      nextFireRef.current = Date.now() + ms;
    }, ms);

    setNextReminderIn(intervalMins * 60);
    countdownRef.current = setInterval(() => {
      if (nextFireRef.current) {
        const secs = Math.max(0, Math.round((nextFireRef.current - Date.now()) / 1000));
        setNextReminderIn(secs);
      }
    }, 1000);
  }, [clearTimers, sendReminder]);

  useEffect(() => {
    if (settings.enabled) {
      startTimers(settings.intervalMins);
    } else {
      clearTimers();
    }
    return clearTimers;
  }, [settings.enabled, settings.intervalMins]);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast({ title: "Browser notifications not supported", variant: "destructive" });
      return;
    }
    const perm = await Notification.requestPermission();
    setPermissionState(perm);
    return perm;
  };

  const handleToggle = async () => {
    if (!settings.enabled) {
      let perm = permissionState;
      if (perm === "default") {
        perm = (await requestPermission()) ?? "default";
      }
      if (perm === "denied") {
        toast({
          title: "Notifications blocked",
          description: "Allow notifications in browser settings, or reminders will appear as toasts.",
        });
      }
      const next = { ...settings, enabled: true };
      setSettings(next);
      saveSettings(next);
    } else {
      const next = { ...settings, enabled: false };
      setSettings(next);
      saveSettings(next);
    }
  };

  const handleIntervalChange = (val: string) => {
    const next = { ...settings, intervalMins: Number(val) };
    setSettings(next);
    saveSettings(next);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
          <Droplets className="h-4 w-4 text-blue-500" /> Hydration Reminder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Select
                value={settings.intervalMins.toString()}
                onValueChange={handleIntervalChange}
                disabled={!settings.enabled}
              >
                <SelectTrigger className="w-[148px] font-mono text-sm">
                  <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="font-mono text-sm">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {settings.enabled && nextReminderIn !== null && (
                <Badge variant="outline" className="font-mono text-xs text-blue-600 border-blue-400/40 bg-blue-500/5 gap-1">
                  <Clock className="h-3 w-3" />
                  {formatCountdown(nextReminderIn)}
                </Badge>
              )}
            </div>

            <Button
              variant={settings.enabled ? "default" : "outline"}
              size="sm"
              onClick={handleToggle}
              className={`gap-2 font-bold uppercase tracking-wider text-xs ${settings.enabled ? "bg-blue-600 hover:bg-blue-700" : ""}`}
            >
              {settings.enabled ? (
                <><Bell className="h-3.5 w-3.5" /> On</>
              ) : (
                <><BellOff className="h-3.5 w-3.5" /> Off</>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground font-mono">
            {settings.enabled
              ? `Reminders every ${settings.intervalMins} min — drink up!`
              : "Turn on to get reminders to drink water throughout the day."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
