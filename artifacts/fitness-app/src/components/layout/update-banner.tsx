import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { withBase } from "@/lib/base-path";
import { Button } from "@/components/ui/button";

/** The main script this page is running, e.g. "index-AbC123.js". */
function runningBuild(): string | null {
  const src = [...document.querySelectorAll<HTMLScriptElement>("script[type=module][src]")]
    .map((s) => s.src.match(/assets\/(index-[\w-]+\.js)/)?.[1])
    .find(Boolean);
  return src ?? null;
}

/**
 * Home Screen apps on iPhone keep running the version they opened with.
 * When a newer version is live, offer a one-tap refresh.
 */
export function UpdateBanner() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const mine = runningBuild();
    if (!mine) return; // dev server
    const check = async () => {
      try {
        const res = await fetch(withBase("/api/version"), { cache: "no-store" });
        const { build } = (await res.json()) as { build: string | null };
        if (build && build !== mine) setStale(true);
      } catch {
        /* offline: try later */
      }
    };
    void check();
    const onVisible = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(check, 10 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  if (!stale) return null;
  return (
    <div className="fixed inset-x-3 top-3 z-[60] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-foreground px-4 py-3 text-sm text-background shadow-lg" role="status" data-testid="update-banner">
      <span>A new version of the app is ready.</span>
      <Button size="sm" variant="secondary" className="shrink-0 gap-1.5" onClick={() => window.location.reload()}>
        <RefreshCw className="h-4 w-4" /> Refresh
      </Button>
    </div>
  );
}
