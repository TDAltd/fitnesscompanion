import { createRoot } from "react-dom/client";
import "@fontsource/lexend/400.css";
import "@fontsource/lexend/500.css";
import "@fontsource/lexend/600.css";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/600.css";
import "@fontsource/nunito-sans/700.css";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { BASE } from "./lib/base-path";
import { enqueue, getQueue, queueKind, standIn } from "./lib/offline-queue";
import { registerServiceWorker } from "./lib/push";
import "./index.css";
import { installErrorReporting } from "./lib/error-reporting";

installErrorReporting();

// All generated API calls ("/api/...") go to "<hosting folder>/api/..."
setBaseUrl(BASE || null);

// Tell the server which timezone this device is in, so "today" starts at local midnight
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const nativeFetch = window.fetch.bind(window);
(window as Window & { nativeFetch?: typeof fetch }).nativeFetch = nativeFetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.includes("/api/")) return nativeFetch(input, init);
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  if (timezone && !headers.has("x-timezone")) headers.set("x-timezone", timezone);
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  const q = queueKind(url, method, BASE);
  if (!q) return nativeFetch(input, { ...init, headers });

  // Food, habit ticks and weight: if there's no connection, keep them on the phone and send later
  const queueIt = () => {
    const item = enqueue(q.kind, q.path, init?.body, timezone);
    return new Response(JSON.stringify(standIn(item)), { status: 201, headers: { "content-type": "application/json", "x-offline-queued": "1" } });
  };
  // Keep the order: if older entries are still waiting, this one waits behind them
  if (!navigator.onLine || getQueue().length) return queueIt();
  try {
    return await nativeFetch(input, { ...init, headers });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    return queueIt();
  }
};

// Always light, whatever the phone/computer's dark mode setting
document.documentElement.classList.remove("dark");

createRoot(document.getElementById("root")!).render(<App />);

// Lets the app open with no signal (and shows notifications)
registerServiceWorker();
