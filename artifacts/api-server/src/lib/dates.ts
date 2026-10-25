import type { Request } from "express";

/** Used when we don't know the user's timezone yet. Set APP_TIMEZONE in cPanel to change. */
export const DEFAULT_TZ = process.env.APP_TIMEZONE ?? "Africa/Lagos";

export function validTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** YYYY-MM-DD for an instant in a given timezone. */
export function dateInTz(when: Date, tz: string = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: validTimezone(tz) ? tz : DEFAULT_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(when);
}

/** The timezone for this request: the app's header, else the user's saved one, else the default. */
export function tzFor(req: Request): string {
  const header = req.get("x-timezone");
  if (validTimezone(header)) return header;
  if (validTimezone(req.user?.timezone)) return req.user!.timezone!;
  return DEFAULT_TZ;
}

export const todayFor = (req: Request) => dateInTz(new Date(), tzFor(req));

/** Add days to a YYYY-MM-DD string (calendar maths, no timezone drift). */
export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
