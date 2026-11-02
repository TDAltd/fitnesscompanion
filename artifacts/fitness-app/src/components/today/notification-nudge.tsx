import { useEffect, useState } from "react";
import { BellRing, Droplets, Dumbbell, Loader2, Scale, Utensils } from "lucide-react";
import { Link } from "wouter";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePushDevice } from "@/lib/push";

const KEY = "fc-push-nudge"; // set once asked, on this phone
const DESKTOP =
  " md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border md:pb-0 md:data-[state=open]:slide-in-from-bottom-4 md:data-[state=closed]:slide-out-to-bottom-4";

const asked = () => {
  try {
    return localStorage.getItem(KEY) != null;
  } catch {
    return true; // can't remember the answer, so don't keep asking
  }
};
const remember = (answer: string) => {
  try {
    localStorage.setItem(KEY, answer);
  } catch {
    /* ignore */
  }
};

/**
 * First visit to Today on a phone that can show notifications: ask once to turn reminders on.
 * Skipped where it can't work (iPhone Safari tab, blocked, unsupported) or once answered.
 */
export function NotificationNudge() {
  const device = usePushDevice();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (device.state !== "off" || asked()) return;
    const t = window.setTimeout(() => setOpen(true), 1200); // let Today appear first
    return () => window.clearTimeout(t);
  }, [device.state]);

  const close = (answer: string) => {
    remember(answer);
    setOpen(false);
  };

  const turnOn = async () => {
    try {
      const ok = await device.turnOn();
      close(ok ? "yes" : "declined");
      if (ok) toast({ title: "Reminders are on", description: "Change which ones you get in Me → Reminders." });
    } catch (err) {
      close("error");
      toast({ title: "Couldn't turn on reminders", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close("dismissed")}>
      <SheetContent side="bottom" className={"mx-auto w-full max-w-md rounded-t-3xl px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6" + DESKTOP} data-testid="notification-nudge">
        <SheetHeader className="items-center text-center">
          <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BellRing className="h-7 w-7" />
          </span>
          <SheetTitle className="font-display text-2xl font-medium">Want a nudge when it matters?</SheetTitle>
          <SheetDescription>Reminders only go off if you haven't done it yet. You can change or stop them any time.</SheetDescription>
        </SheetHeader>
        <ul className="my-5 grid grid-cols-2 gap-2 text-sm">
          {[
            [<Droplets key="w" className="h-4 w-4" />, "Water, if you're behind"],
            [<Dumbbell key="d" className="h-4 w-4" />, "Workout days"],
            [<Utensils key="u" className="h-4 w-4" />, "Log lunch and dinner"],
            [<Scale key="s" className="h-4 w-4" />, "Weekly weigh-in"],
          ].map(([icon, label]) => (
            <li key={label as string} className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2.5">
              <span className="text-primary">{icon}</span>
              {label}
            </li>
          ))}
        </ul>
        <div className="space-y-2">
          <Button className="h-12 w-full text-base" onClick={() => void turnOn()} disabled={device.busy} data-testid="button-nudge-on">
            {device.busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Turn on reminders
          </Button>
          <Button variant="ghost" className="h-11 w-full" onClick={() => close("later")} data-testid="button-nudge-later">
            Not now
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Or choose exactly which ones in{" "}
            <Link href="/reminders" onClick={() => close("settings")} className="font-semibold text-primary">Reminders</Link>.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
