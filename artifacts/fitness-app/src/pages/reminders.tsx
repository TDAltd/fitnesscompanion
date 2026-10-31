import { useState } from "react";
import { BellOff, BellRing, CalendarPlus, ChevronDown, Droplets, Dumbbell, Loader2, Scale, Share, Smartphone, Utensils } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { usePushDevice, useReminderSettings, useSaveReminderSettings, type ReminderSettings } from "@/lib/push";
import { getGetProfileQueryKey, useGetProfile } from "@workspace/api-client-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePlan } from "@/lib/plan";
import { cn } from "@/lib/utils";

const WATER_TIMES = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
const ICS_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const WORKOUT_TIME: Record<string, string> = { Morning: "06:30", Afternoon: "12:30", Evening: "17:30" };

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const localDate = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

function event(uid: string, start: Date, time: string, minutes: number, title: string, rule: string, note: string) {
  const [h, m] = time.split(":").map(Number);
  const s = `${localDate(start)}T${pad(h)}${pad(m)}00`;
  const endM = h * 60 + m + minutes;
  const e = `${localDate(start)}T${pad(Math.floor(endM / 60))}${pad(endM % 60)}00`;
  return [
    "BEGIN:VEVENT",
    `UID:${uid}@fitness-companion`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${s}`,
    `DTEND:${e}`,
    `RRULE:${rule}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${note}`,
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${title}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
  ].join("\r\n");
}

function CalendarReminders() {
  const { plan } = usePlan();
  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const [times, setTimes] = useState<string[]>(["10:00", "12:00", "14:00", "16:00", "18:00"]);
  const [workouts, setWorkouts] = useState(true);
  const workoutTime = WORKOUT_TIME[profile?.workoutTimePreference ?? ""] ?? "17:30";
  const trainingDays = plan?.schedule.filter((d) => !d.rest) ?? [];
  const litres = plan?.targets.waterLitres ?? 2.5;
  const glass = Math.max(1, Math.round((litres * 1000) / Math.max(times.length, 1) / 50) * 50);

  const download = () => {
    const today = new Date();
    const events = times.map((t, i) =>
      event(`water-${i}-${t}`, today, t, 5, "💧 Drink water", "FREQ=DAILY", `About ${glass} ml now. Daily goal: ${litres} L. Tick it off in Fitness Companion.`),
    );
    if (workouts && trainingDays.length) {
      events.push(
        event(
          "workout",
          today,
          workoutTime,
          profile?.workoutDurationMinutes ?? 45,
          "🏋️ Workout time",
          `FREQ=WEEKLY;BYDAY=${trainingDays.map((d) => ICS_DAYS[d.day]).join(",")}`,
          "Open Fitness Companion → Train for today's session.",
        ),
      );
    }
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fitness Companion//Reminders//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Fitness Companion", ...events, "END:VCALENDAR"].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "fitness-companion-reminders.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const toggle = (t: string) => setTimes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t].sort()));

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Droplets className="h-4 w-4 text-primary" /> Water times</p>
        <p className="mb-2 text-xs text-muted-foreground">
          Goal {litres} L a day. {times.length ? `About ${glass} ml at each reminder.` : "Pick at least one time."}
        </p>
        <div className="flex flex-wrap gap-2">
          {WATER_TIMES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={times.includes(t)}
              onClick={() => toggle(t)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-semibold tabular-nums transition-colors",
                times.includes(t) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="workout-rem" className="cursor-pointer">
          <span className="flex items-center gap-2 text-sm font-semibold"><Dumbbell className="h-4 w-4 text-primary" /> Workouts</span>
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            {trainingDays.length ? `${trainingDays.map((d) => d.label.slice(0, 3)).join(", ")} at ${workoutTime}` : "No training days in your plan yet."}
          </span>
        </Label>
        <Switch id="workout-rem" checked={workouts} onCheckedChange={setWorkouts} disabled={!trainingDays.length} />
      </div>
      <Button variant="outline" className="h-11 w-full gap-2" disabled={!times.length && !workouts} onClick={download} data-testid="button-download-reminders">
        <CalendarPlus className="h-4 w-4" /> Add to my calendar
      </Button>
      <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
        <li>On iPhone, Safari shows the reminders; tap <b className="text-foreground">Add All</b>, pick a calendar, then <b className="text-foreground">Done</b>.</li>
        <li>Calendar alerts don't know what you've logged, so they go off even if you've already had your water.</li>
      </ol>
    </div>
  );
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const fmt12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
};

/** Same rule as the server: 8:30 pm, or an hour before bed if that's earlier. */
const dinnerTime = (bed: string) => {
  const [h, m] = bed.split(":").map(Number);
  const mins = Math.min(20 * 60 + 30, h * 60 + m - 60);
  return fmt12(`${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`);
};

export default function RemindersPage() {
  const device = usePushDevice();
  const { data: settings } = useReminderSettings();
  const save = useSaveReminderSettings();
  const { plan } = usePlan();
  const { toast } = useToast();
  const [showCalendar, setShowCalendar] = useState(false);
  const [testing, setTesting] = useState(false);
  const litres = plan?.targets.waterLitres ?? 2.5;

  const update = (patch: Partial<ReminderSettings>) =>
    save.mutate(patch, { onError: (err) => toast({ title: "Couldn't save", description: (err as Error).message, variant: "destructive" }) });

  const turnOn = async () => {
    try {
      await device.turnOn();
    } catch (err) {
      toast({ title: "Couldn't turn on notifications", description: (err as Error).message, variant: "destructive" });
    }
  };
  const sendTest = async () => {
    setTesting(true);
    try {
      await device.test();
      toast({ title: "Test sent", description: "It should arrive in a few seconds." });
    } catch (err) {
      toast({ title: "Test didn't send", description: (err as Error).message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5 pb-16">
      <PageHeader title="Reminders" description="Nudges from the app for water, workouts, meals and weigh-ins." />

      <Card data-testid="push-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg"><Smartphone className="h-5 w-5 text-primary" /> Notifications on this device</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {device.state === "loading" && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {device.state === "needs-home-screen" && (
            <div className="space-y-2" data-testid="push-needs-home-screen">
              <p>On iPhone, notifications only work when Fitness Companion is opened from your Home Screen.</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>In Safari, tap <Share className="inline h-4 w-4 align-text-bottom" /> <b className="text-foreground">Share</b>, then <b className="text-foreground">Add to Home Screen</b>.</li>
                <li>Open the app from the new icon and come back to Me → Reminders.</li>
                <li>Tap <b className="text-foreground">Turn on notifications</b> and allow them.</li>
              </ol>
              <p className="text-xs text-muted-foreground">Needs iOS 16.4 or newer.</p>
            </div>
          )}
          {device.state === "unsupported" && <p>This browser can't show notifications. Use the calendar option at the bottom instead.</p>}
          {device.state === "denied" && (
            <p data-testid="push-denied">
              Notifications are blocked for this app. On iPhone go to <b>Settings → Notifications → Fitness Companion</b> and allow them; in a
              browser, allow notifications in the site settings. Then come back here.
            </p>
          )}
          {device.state === "off" && (
            <>
              <p className="text-muted-foreground">Get reminders straight from the app. They only go off when you actually need them.</p>
              <Button className="h-12 w-full gap-2 text-base" onClick={() => void turnOn()} disabled={device.busy} data-testid="button-push-on">
                {device.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-5 w-5" />} Turn on notifications
              </Button>
            </>
          )}
          {device.state === "on" && (
            <>
              <p className="flex items-center gap-2 font-semibold text-primary" data-testid="push-on"><BellRing className="h-4 w-4" /> On for this device</p>
              <div className="flex gap-2">
                <Button variant="outline" className="h-11 flex-1" onClick={() => void sendTest()} disabled={testing}>
                  {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send a test
                </Button>
                <Button variant="ghost" className="h-11 gap-2 text-muted-foreground" onClick={() => void device.turnOff()} disabled={device.busy}>
                  <BellOff className="h-4 w-4" /> Turn off
                </Button>
              </div>
            </>
          )}
          {settings && settings.devices > (device.state === "on" ? 1 : 0) && (
            <p className="text-xs text-muted-foreground">
              Also on {settings.devices - (device.state === "on" ? 1 : 0)} other device{settings.devices - (device.state === "on" ? 1 : 0) === 1 ? "" : "s"}.
            </p>
          )}
        </CardContent>
      </Card>

      {settings && (
        <Card data-testid="reminder-settings">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">What to remind you about</CardTitle>
            <CardDescription>Each one stays quiet if you've already done it.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y p-0">
            <div className="grid grid-cols-2 gap-3 px-5 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="wake">I wake up</Label>
                <Input id="wake" type="time" value={settings.wakeTime} onChange={(e) => e.target.value && update({ wakeTime: e.target.value })} className="h-11 text-base" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bed">I go to bed</Label>
                <Input id="bed" type="time" value={settings.bedTime} onChange={(e) => e.target.value && update({ bedTime: e.target.value })} className="h-11 text-base" />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">No reminders before you wake up or after bedtime.</p>
            </div>

            <Row
              id="r-water"
              icon={<Droplets className="h-5 w-5 text-primary" />}
              title="Water"
              body={`Only when you're a glass or more behind for the time of day. Stops once you reach ${litres} L.`}
              checked={settings.water}
              onChange={(v) => update({ water: v })}
            />
            <Row
              id="r-workout"
              icon={<Dumbbell className="h-5 w-5 text-primary" />}
              title="Workout"
              body="On training days, if you haven't logged a session yet."
              checked={settings.workout}
              onChange={(v) => update({ workout: v })}
            >
              <Input type="time" aria-label="Workout reminder time" value={settings.workoutTime} onChange={(e) => e.target.value && update({ workoutTime: e.target.value })} className="h-10 w-32 text-base" />
            </Row>
            <Row
              id="r-meals"
              icon={<Utensils className="h-5 w-5 text-primary" />}
              title="Log meals"
              body={`Lunch at 2:30 pm and dinner at ${dinnerTime(settings.bedTime)}, only if not logged yet.`}
              checked={settings.meals}
              onChange={(v) => update({ meals: v })}
            />
            <Row
              id="r-weigh"
              icon={<Scale className="h-5 w-5 text-primary" />}
              title="Weigh-in"
              body="Once a week, in the morning, if you haven't weighed in that week."
              checked={settings.weighIn}
              onChange={(v) => update({ weighIn: v })}
            >
              <select
                aria-label="Weigh-in day"
                value={settings.weighInDay}
                onChange={(e) => update({ weighInDay: Number(e.target.value) })}
                className="h-10 rounded-xl border bg-background px-3 text-base"
              >
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </Row>
          </CardContent>
        </Card>
      )}

      <Card>
        <button
          type="button"
          onClick={() => setShowCalendar((v) => !v)}
          aria-expanded={showCalendar}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        >
          <span>
            <span className="block text-sm font-semibold">Prefer calendar alerts?</span>
            <span className="block text-xs text-muted-foreground">For older phones, or if you use the app in Safari.</span>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", showCalendar && "rotate-180")} />
        </button>
        {showCalendar && (
          <CardContent className="border-t pt-4">
            <CalendarReminders />
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function Row({ id, icon, title, body, checked, onChange, children }: { id: string; icon: React.ReactNode; title: string; body: string; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <Label htmlFor={id} className="flex cursor-pointer gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
          <span>
            <span className="block text-base font-semibold">{title}</span>
            <span className="mt-0.5 block text-sm font-normal text-muted-foreground">{body}</span>
          </span>
        </Label>
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
      </div>
      {children && checked && <div className="mt-3 pl-8">{children}</div>}
    </div>
  );
}
