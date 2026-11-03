import { Router } from "express";
import { desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db, errorEventsTable } from "@workspace/db";
import { getSessionUser, rateLimit, requireAdmin } from "../lib/auth";
import { dailyErrorEmail, recordError } from "../lib/errors";
import { setSetting } from "../lib/backup";
import { mailConfigured } from "../lib/mail";

/** The app reports its own crashes here (signed in or not, e.g. during the sign-up quiz). */
export const clientErrorsRouter = Router();

// Noise from browsers, extensions and dropped connections, not from the app
const IGNORE = [/ResizeObserver loop/i, /^Script error\.?$/i, /extension:\/\//i, /^(Load failed|Failed to fetch|NetworkError when attempting to fetch resource\.?)$/i, /AbortError/i];

clientErrorsRouter.post("/client-errors", async (req, res) => {
  res.status(204).send();
  if (!rateLimit(`client-errors:${req.ip}`, 60, 60 * 60 * 1000)) return;
  const b = (req.body ?? {}) as Record<string, unknown>;
  const message = typeof b.message === "string" ? b.message.trim() : "";
  if (!message || IGNORE.some((r) => r.test(message)) || (typeof b.stack === "string" && /extension:\/\//.test(b.stack))) return;
  const user = await getSessionUser(req).catch(() => null);
  await recordError({
    source: "app",
    message,
    detail: [b.stack, b.componentStack].filter((x) => typeof x === "string" && x).join("\n\n") || null,
    page: typeof b.page === "string" ? b.page : null,
    userAgent: req.get("user-agent"),
    userId: user?.id ?? null,
  });
});

export const adminErrorsRouter = Router();
adminErrorsRouter.use("/admin/errors", requireAdmin);

adminErrorsRouter.get("/admin/errors", async (req, res) => {
  // Remember the public address for links in the daily email
  const host = req.get("x-forwarded-host") ?? req.get("host");
  if (host && !/^(localhost|127\.)/.test(host)) {
    const proto = (req.get("x-forwarded-proto") ?? req.protocol).split(",")[0];
    void setSetting("app_origin", `${proto === "http" ? "https" : proto}://${host}`).catch(() => undefined);
  }
  const fixed = req.query.status === "fixed";
  const rows = await db
    .select()
    .from(errorEventsTable)
    .where(fixed ? isNotNull(errorEventsTable.resolvedAt) : isNull(errorEventsTable.resolvedAt))
    .orderBy(desc(errorEventsTable.lastSeen))
    .limit(200);
  res.json({
    emailOn: mailConfigured(),
    errors: rows.map(({ userIds, fingerprint: _f, ...r }) => ({ ...r, people: userIds.length })),
  });
});

adminErrorsRouter.put("/admin/errors/:id", async (req, res) => {
  const id = Number(req.params.id);
  const fixed = req.body?.fixed === true;
  await db.update(errorEventsTable).set({ resolvedAt: fixed ? new Date() : null }).where(eq(errorEventsTable.id, id));
  res.json({ ok: true });
});

adminErrorsRouter.post("/admin/errors/fix-all", async (_req, res) => {
  await db.update(errorEventsTable).set({ resolvedAt: new Date() }).where(isNull(errorEventsTable.resolvedAt));
  res.json({ ok: true });
});

adminErrorsRouter.delete("/admin/errors/:id", async (req, res) => {
  await db.delete(errorEventsTable).where(eq(errorEventsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

/** Send today's summary now (for testing the email). */
adminErrorsRouter.post("/admin/errors/email", async (_req, res) => {
  res.json(await dailyErrorEmail(true));
});
