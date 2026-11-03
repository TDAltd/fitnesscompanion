import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CloudOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { withBase } from "@/lib/base-path";
import { flush, getQueue, setOnline, useOfflineQueue, type Queued } from "@/lib/offline-queue";
import { reportError } from "@/lib/error-reporting";

const send = (item: Queued) => {
  const f = (window as Window & { nativeFetch?: typeof fetch }).nativeFetch ?? fetch;
  return f(withBase(item.path), {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "x-timezone": item.timezone, "x-offline-id": item.id },
    body: JSON.stringify(item.body),
  });
};

const LABEL = { food: "food", habit: "habit tick", weight: "weigh-in" } as const;

/** Sends entries saved offline as soon as there's a connection, and shows what's waiting. */
export function OfflineSync() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { queue, online } = useOfflineQueue();

  useEffect(() => {
    const tryNow = async () => {
      if (!getQueue().length) return;
      const sent = await flush(send, (item, status) => {
        reportError(new Error(`Offline ${item.kind} entry refused by the server (${status})`));
        toast({ title: `A ${LABEL[item.kind]} saved offline couldn't be added`, description: "Please log it again.", variant: "destructive" });
      });
      if (sent > 0) {
        await qc.invalidateQueries();
        toast({ title: sent === 1 ? "Your offline entry was sent" : `${sent} offline entries sent` });
      }
    };
    void tryNow();
    const onOnline = () => {
      setOnline(true);
      void tryNow();
    };
    const onOffline = () => setOnline(false);
    const onVisible = () => document.visibilityState === "visible" && void tryNow();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void tryNow(), 20_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [qc, toast]);

  if (online && !queue.length) return null;
  const n = queue.length;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.75rem)] z-[55] flex justify-center px-3"
      role="status"
      data-testid="offline-banner"
    >
      <div className="flex items-center gap-2 rounded-full bg-foreground/90 px-3.5 py-1.5 text-xs font-semibold text-background shadow-lg">
        {online && n ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudOff className="h-3.5 w-3.5" />}
        {online
          ? `Sending ${n} saved ${n === 1 ? "entry" : "entries"}…`
          : n
            ? `Offline · ${n} ${n === 1 ? "entry" : "entries"} saved on this phone`
            : "Offline · logging still works"}
      </div>
    </div>
  );
}
