import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "@/lib/error-reporting";
import { withBase } from "@/lib/base-path";

/** If a screen crashes, show a way out instead of a blank page, and report it. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { componentStack: info.componentStack ?? undefined });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-background px-6 text-center">
        <div className="max-w-sm space-y-4">
          <p className="text-4xl" aria-hidden>🛠️</p>
          <h1 className="font-display text-xl font-semibold">Something went wrong on this screen</h1>
          <p className="text-sm text-muted-foreground">It's been reported so we can fix it. Your logged data is safe.</p>
          <div className="flex flex-col gap-2">
            <button type="button" className="h-11 rounded-full bg-primary px-5 font-semibold text-primary-foreground" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button
              type="button"
              className="h-11 rounded-full px-5 text-sm font-semibold text-primary"
              onClick={() => {
                window.location.href = withBase("/today");
              }}
            >
              Go to Today
            </button>
          </div>
        </div>
      </main>
    );
  }
}
