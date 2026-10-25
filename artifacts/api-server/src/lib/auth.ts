import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response, NextFunction } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, sessionsTable, usersTable, activityDaysTable, appSettingsTable } from "@workspace/db";
import { DEFAULT_TZ, dateInTz, validTimezone } from "./dates";
import { COOKIE_PATH } from "./config";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const SESSION_COOKIE = "fit_session";
const SESSION_DAYS = 30;

// ---------- passwords (scrypt, no native modules needed on shared hosting) ----------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltHex, keyHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ---------- sessions ----------

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(res: Response, userId: number, secure: boolean) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({ id: hashToken(token), userId, expiresAt });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    expires: expiresAt,
    path: COOKIE_PATH,
  });
}

export async function destroySession(req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string" && token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, hashToken(token)));
  }
  res.clearCookie(SESSION_COOKIE, { path: COOKIE_PATH });
}

export type SessionUser = { id: number; email: string; role: string; disabled: boolean; isAdmin: boolean; timezone: string | null };

/** Emails listed in ADMIN_EMAILS (comma separated) are always admins: the way the first admin is created. */
export function envAdmins(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const isAdminUser = (u: { email: string; role: string }) => u.role === "admin" || envAdmins().includes(u.email);

export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || !token) return null;
  const [row] = await db
    .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role, disabledAt: usersTable.disabledAt, timezone: usersTable.timezone })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .where(and(eq(sessionsTable.id, hashToken(token)), gt(sessionsTable.expiresAt, new Date())));
  if (!row) return null;
  return { id: row.id, email: row.email, role: row.role, disabled: row.disabledAt != null, isAdmin: isAdminUser(row), timezone: row.timezone };
}

// ---------- activity tracking (one write per user per day per server process) ----------

const seenToday = new Set<string>();

export async function recordActivity(user: SessionUser, tzHeader?: string) {
  const tz = validTimezone(tzHeader) ? tzHeader : user.timezone ?? DEFAULT_TZ;
  const date = dateInTz(new Date(), tz);
  const key = `${user.id}:${date}:${tz}`;
  if (seenToday.has(key)) return;
  if (seenToday.size > 50_000) seenToday.clear();
  seenToday.add(key);
  await db.insert(activityDaysTable).values({ userId: user.id, date }).onConflictDoNothing();
  await db
    .update(usersTable)
    .set({ lastActiveAt: new Date(), ...(validTimezone(tzHeader) && tzHeader !== user.timezone ? { timezone: tzHeader } : {}) })
    .where(eq(usersTable.id, user.id));
}

// ---------- app settings ----------

/** Sign-ups are open unless an admin closed them (or ALLOW_SIGNUPS=false and no admin choice yet). */
export async function signupsOpen(): Promise<boolean> {
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "signups_open"));
  if (row) return row.value === "true";
  return process.env.ALLOW_SIGNUPS !== "false";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/** Blocks the request with 401 unless a valid session cookie is present. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: "Please log in" });
      return;
    }
    if (user.disabled) {
      await destroySession(req, res);
      res.status(401).json({ error: "This account has been disabled. Contact the app owner." });
      return;
    }
    req.user = user;
    recordActivity(user, req.get("x-timezone")).catch((err) => req.log?.warn({ err }, "activity tracking failed"));
    next();
  } catch (err) {
    next(err);
  }
}

/** The logged-in user's id. Only call inside routes protected by requireAuth. */
export function uid(req: Request): number {
  if (!req.user) throw new Error("requireAuth middleware missing");
  return req.user.id;
}

// ---------- tiny in-memory rate limiter ----------

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Returns true if the action is allowed, false if the limit is hit. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
    }
    return true;
  }
  bucket.count++;
  return bucket.count <= limit;
}

/** Only admins past this point. Use after requireAuth. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: "Admins only" });
    return;
  }
  next();
}
