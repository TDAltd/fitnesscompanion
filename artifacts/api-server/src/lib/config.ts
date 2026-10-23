// The folder the app is served from, e.g. "/fitnesscompanion" (no trailing slash), or "" at a domain root.
// Baked in at build time from BASE_PATH (see build.mjs); can be overridden at runtime with BASE_PATH.
declare const __BUILD_BASE_PATH__: string | undefined;

function normalize(p: string | undefined): string {
  const trimmed = (p ?? "").replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
}

export const BASE_PATH = normalize(
  process.env.BASE_PATH ?? (typeof __BUILD_BASE_PATH__ === "string" ? __BUILD_BASE_PATH__ : ""),
);

export const COOKIE_PATH = BASE_PATH || "/";
