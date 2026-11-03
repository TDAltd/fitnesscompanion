import { createHash } from "node:crypto";
import { and, desc, gt, isNull, or, sql } from "drizzle-orm";
import { db, errorEventsTable, usersTable } from "@workspace/db";
import { logger } from "./logger";
import { mailConfigured, sendMail, appUrl } from "./mail";
import { envAdmins } from "./auth";
import { getSetting, setSetting } from "./backup";

export type ErrorSource = "app" | "server" | "health-sync";

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.slice(0, n) : s == null ? null : String(s).slice(0, n));

/** Same problem, same place → same row: numbers, ids and asset hashes don't make a new one. */
const normalize = (s: string) =>
  s
    .replace(/[0-9a-f]{8,}/gi, "#")
    .replace(/\d+/g, "#")
    .replace(/-[A-Za-z0-9_]{8}\.js/g, ".js")
    .trim();

export const pagePattern = (p: string | null | undefined) => (p ? normalize(p.split("?")[0]) : null);

export async function recordError(e: {
  source: ErrorSource;
  message: string;
  detail?: string | null;
  page?: string | null;
  userAgent?: string | null;
  userId?: number | null;
}) {
  try {
    const message = clip(e.message, 500) || "Unknown error";
    const page = clip(pagePattern(e.page), 200);
    const fingerprint = createHash("sha1").update(`${e.source}|${normalize(message)}|${page ?? ""}`).digest("hex");
    const uid = e.userId ?? null;
    await db
      .insert(errorEventsTable)
      .values({
        fingerprint,
        source: e.source,
        message,
        detail: clip(e.detail, 4000),
        page,
        userAgent: clip(e.userAgent, 300),
        userIds: uid ? [uid] : [],
      })
      .onConflictDoUpdate({
        target: errorEventsTable.fingerprint,
        set: {
          count: sql`${errorEventsTable.count} + 1`,
          lastSeen: sql`now()`,
          message,
          detail: clip(e.detail, 4000),
          userAgent: clip(e.userAgent, 300),
          resolvedAt: null, // happening again: back on the open list
          userIds:
            uid == null
              ? sql`${errorEventsTable.userIds}`
              : sql`CASE WHEN ${errorEventsTable.userIds} @> ${JSON.stringify([uid])}::jsonb OR jsonb_array_length(${errorEventsTable.userIds}) >= 100
                     THEN ${errorEventsTable.userIds} ELSE ${errorEventsTable.userIds} || ${JSON.stringify([uid])}::jsonb END`,
        },
      });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "could not record error");
  }
}

/** Plain-language name for the error list. */
export function describeSource(s: string) {
  return s === "app" ? "In the app" : s === "server" ? "On the server" : s === "health-sync" ? "Health sync" : s;
}

const lagos = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" }));

/**
 * Once a day after 8 am Lagos time: email the admins what's new or still happening since the
 * last email. Nothing is sent on days without problems.
 */
export async function dailyErrorEmail(force = false): Promise<{ sent: boolean; count: number }> {
  const now = lagos();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (!force && (now.getHours() < 8 || (await getSetting("errors_email_day")) === today)) return { sent: false, count: 0 };
  if (!mailConfigured()) return { sent: false, count: 0 };
  const rows = await db
    .select()
    .from(errorEventsTable)
    .where(and(isNull(errorEventsTable.resolvedAt), or(isNull(errorEventsTable.emailedAt), gt(errorEventsTable.lastSeen, errorEventsTable.emailedAt))))
    .orderBy(desc(errorEventsTable.count))
    .limit(30);
  await setSetting("errors_email_day", today);
  if (!rows.length) return { sent: false, count: 0 };

  const admins = await db.select({ email: usersTable.email, role: usersTable.role }).from(usersTable);
  const to = [...new Set([...admins.filter((a) => a.role === "admin").map((a) => a.email), ...envAdmins()])];
  if (!to.length) return { sent: false, count: rows.length };

  let base = appUrl();
  if (!/^https?:\/\//.test(base)) base = `${(await getSetting("app_origin")) ?? ""}${base}`;
  const link = `${base}/admin#problems`;
  const lines = rows.map((r) => {
    const tag = r.emailedAt ? "Still happening" : "New";
    const people = r.userIds.length ? `, ${r.userIds.length} ${r.userIds.length === 1 ? "person" : "people"}` : "";
    return { tag, text: `${describeSource(r.source)}${r.page ? ` (${r.page})` : ""}: ${r.message}`, meta: `${r.count}×${people}` };
  });
  const text = `Fitness Companion: ${rows.length} problem${rows.length === 1 ? "" : "s"} to look at\n\n${lines
    .map((l) => `[${l.tag}] ${l.text} — ${l.meta}`)
    .join("\n")}\n\nSee them all: ${link}`;
  const html = `<p><b>${rows.length} problem${rows.length === 1 ? "" : "s"}</b> since the last email.</p><ul>${lines
    .map((l) => `<li><b>${l.tag}</b> · ${escapeHtml(l.text)} <span style="color:#666">(${l.meta})</span></li>`)
    .join("")}</ul><p><a href="${link}">Open Admin → Problems</a></p>`;
  let sent = false;
  for (const addr of to) sent = (await sendMail(addr, `Fitness Companion: ${rows.length} problem${rows.length === 1 ? "" : "s"} to look at`, text, html)) || sent;
  if (sent) {
    await db
      .update(errorEventsTable)
      .set({ emailedAt: sql`now()` })
      .where(sql`${errorEventsTable.id} IN (${sql.join(rows.map((r) => sql`${r.id}`), sql`, `)})`);
  }
  return { sent, count: rows.length };
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Fixed problems older than 60 days are removed. */
export async function pruneErrors() {
  await db.delete(errorEventsTable).where(sql`${errorEventsTable.resolvedAt} < now() - interval '60 days'`);
}
