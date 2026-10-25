import { useState } from "react";
import { BellRing, CalendarPlus, Droplets, Dumbbell, Info } from "lucide-react";
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

export default function RemindersPage() {
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
    <div className="mx-auto max-w-2xl space-y-5 pb-16">
      <PageHeader title="Reminders" description="Nudges for water and workouts, on your phone's calendar." />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex gap-3 p-4 text-sm">
          <Info className="h-5 w-5 shrink-0 text-primary" />
          <p>
            A web app can't reliably send notifications on iPhone, so reminders go into your phone's Calendar instead. They pop up
            like any alert and work even when the app is closed. You can delete them from Calendar any time.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Droplets className="h-5 w-5 text-primary" /> Water</CardTitle>
          <CardDescription>
            Your goal is {litres} L a day. {times.length ? `That's about ${glass} ml at each reminder.` : "Pick at least one time."}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <Label htmlFor="workout-rem" className="cursor-pointer">
            <span className="flex items-center gap-2 text-base font-semibold"><Dumbbell className="h-5 w-5 text-primary" /> Workouts</span>
            <span className="mt-1 block text-sm font-normal text-muted-foreground">
              {trainingDays.length
                ? `${trainingDays.map((d) => d.label.slice(0, 3)).join(", ")} at ${workoutTime}`
                : "No training days in your plan yet."}
            </span>
          </Label>
          <Switch id="workout-rem" checked={workouts} onCheckedChange={setWorkouts} disabled={!trainingDays.length} />
        </CardContent>
      </Card>

      <Button className="h-12 w-full gap-2 text-base" disabled={!times.length && !workouts} onClick={download} data-testid="button-download-reminders">
        <CalendarPlus className="h-5 w-5" /> Add reminders to my calendar
      </Button>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Tap the button. On iPhone, Safari shows the reminders; tap <b className="text-foreground">Add All</b>.</li>
        <li>Choose a calendar (or create one called "Fitness") and tap <b className="text-foreground">Done</b>.</li>
        <li>Changed your plan? Delete the old events in Calendar and add them again from here.</li>
      </ol>
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><BellRing className="h-3.5 w-3.5" /> Check Settings → Notifications → Calendar is allowed to alert you.</p>
    </div>
  );
}
