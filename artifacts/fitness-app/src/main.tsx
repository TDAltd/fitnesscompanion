import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { BASE } from "./lib/base-path";

// All generated API calls ("/api/...") go to "<hosting folder>/api/..."
setBaseUrl(BASE || null);
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
