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
import "./index.css";

// All generated API calls ("/api/...") go to "<hosting folder>/api/..."
setBaseUrl(BASE || null);

// Tell the server which timezone this device is in, so "today" starts at local midnight
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const nativeFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (timezone && url.includes("/api/")) {
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has("x-timezone")) headers.set("x-timezone", timezone);
    return nativeFetch(input, { ...init, headers });
  }
  return nativeFetch(input, init);
};

// Follow the phone/computer's light or dark setting
const media = window.matchMedia("(prefers-color-scheme: dark)");
const applyTheme = () => document.documentElement.classList.toggle("dark", media.matches);
applyTheme();
media.addEventListener("change", applyTheme);

createRoot(document.getElementById("root")!).render(<App />);
