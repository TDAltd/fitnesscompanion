import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// In development the API runs separately (default http://localhost:3000).
// In production the API server also serves this built frontend, so /api is same-origin.
const apiTarget = process.env.API_URL ?? "http://localhost:3000";

// Folder the app lives under, e.g. "/fitnesscompanion/" for https://tdaproducthub.com/fitnesscompanion/
// Must start and end with "/". Use "/" when the app has its own domain or subdomain.
const rawBase = process.env.BASE_PATH ?? "/";
const base = `/${rawBase.replace(/^\/+|\/+$/g, "")}/`.replace("//", "/");

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: Number(process.env.PORT ?? 5173),
    proxy: { [`${base}api`]: { target: apiTarget, changeOrigin: true } },
  },
});
