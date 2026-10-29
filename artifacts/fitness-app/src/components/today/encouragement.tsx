import { useState } from "react";
import { Heart, X } from "lucide-react";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useCurrentUser } from "@/lib/auth";
import { useWeekScores } from "@/lib/day-score";

const KEY = "fc-encouragement-dismissed";
const todayKey = () => new Date().toDateString();

/**
 * Shown on harder days only: after 7+ days away, or the day after a weak day.
 * Brings back the person's own "why" from their setup answers.
 */
export function Encouragement() {
  const { data: user } = useCurrentUser();
  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const { scores } = useWeekScores(7);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === todayKey();
    } catch {
      return false;
    }
  });
  if (dismissed) return null;

  const why = profile?.why?.trim();
  const away = user?.daysAway ?? 0;
  const yesterday = scores.at(-2);
  const toughYesterday = Boolean(yesterday && yesterday.possible > 0 && yesterday.percent < 50);

  let title: string | null = null;
  let body = "";
  if (away >= 7) {
    title = `Welcome back. It's been ${away} days.`;
    body = "No catching up needed. Today, log one meal and take a short walk. That's a win.";
  } else if (toughYesterday && why) {
    title = "Yesterday was a hard one. That's normal.";
    body = "Today is a fresh start. One good meal and a walk is enough.";
  }
  if (!title) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, todayKey());
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className="relative flex gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 pr-11" role="note" data-testid="encouragement">
      <Heart className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="space-y-1 text-sm">
        <p className="font-semibold">{title}</p>
        <p className="text-muted-foreground">{body}</p>
        {why && (
          <p className="pt-1">
            <span className="text-muted-foreground">Your why: </span>
            <q className="font-semibold">{why}</q>
          </p>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
