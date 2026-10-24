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

// Follow the phone/computer's light or dark setting
const media = window.matchMedia("(prefers-color-scheme: dark)");
const applyTheme = () => document.documentElement.classList.toggle("dark", media.matches);
applyTheme();
media.addEventListener("change", applyTheme);

createRoot(document.getElementById("root")!).render(<App />);
