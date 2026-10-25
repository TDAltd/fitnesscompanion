import { useState } from "react";
import { Share, SquarePlus, X } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";

const KEY = "fc-install-dismissed";

function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(KEY) === "1";
  } catch {
    /* private mode */
  }
  return iOS && !standalone && !dismissed;
}

/** iPhone Safari only: explain how to put the app on the Home Screen (Safari has no install button). */
export function InstallPrompt() {
  const [show, setShow] = useState(shouldShow);
  if (!show) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };
  return (
    <div className="relative flex gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4" role="note" data-testid="install-prompt">
      <LogoMark className="h-10 w-10 shrink-0" />
      <div className="text-sm">
        <p className="font-semibold">Add Fitness Companion to your Home Screen</p>
        <p className="mt-1 text-muted-foreground">
          It opens full screen like an app. Tap <Share className="mx-0.5 inline h-4 w-4 -translate-y-0.5" aria-label="Share" /> in Safari, then{" "}
          <span className="whitespace-nowrap font-semibold text-foreground">
            <SquarePlus className="mr-0.5 inline h-4 w-4 -translate-y-0.5" />Add to Home Screen
          </span>.
        </p>
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground hover:bg-muted">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
