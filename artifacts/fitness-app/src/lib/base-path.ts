// The folder the app is served from, without a trailing slash: "" at a domain root,
// "/fitnesscompanion" when hosted at https://example.com/fitnesscompanion/
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Prefix an app-absolute path such as "/api/export" with the hosting folder. */
export const withBase = (path: string) => `${BASE}${path}`;
