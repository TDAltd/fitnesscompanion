import { withBase } from "./base-path";

/**
 * Send crashes to Admin → Problems. Same message is sent once per visit, at most 15 per visit,
 * and never anything the person typed: only the error, where it happened and the page.
 */
const sent = new Set<string>();

const appPage = () => {
  const p = window.location.pathname;
  const base = withBase("/").replace(/\/$/, "");
  return (p.startsWith(base) ? p.slice(base.length) : p) || "/";
};

export function reportError(err: unknown, extra: { componentStack?: string } = {}) {
  try {
    const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err) ?? "Unknown error");
    const key = `${e.message}|${appPage()}`;
    if (sent.has(key) || sent.size >= 15) return;
    sent.add(key);
    void fetch(withBase("/api/client-errors"), {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `${e.name && e.name !== "Error" ? `${e.name}: ` : ""}${e.message}`, stack: e.stack?.slice(0, 3000), componentStack: extra.componentStack?.slice(0, 2000), page: appPage() }),
    }).catch(() => undefined);
  } catch {
    /* never let reporting break the app */
  }
}

export function installErrorReporting() {
  window.addEventListener("error", (ev) => {
    // Failed <script>/<img> loads have no error object; a missing app script after an update shows as this
    if (!ev.error && ev.target && ev.target !== window) return;
    reportError(ev.error ?? ev.message);
  });
  window.addEventListener("unhandledrejection", (ev) => {
    const r = ev.reason as { status?: number; name?: string } | undefined;
    // Expected answers from the server (wrong password, not logged in...) aren't bugs
    if (r && typeof r.status === "number" && r.status < 500) return;
    reportError(ev.reason);
  });
}
