import { Router } from "express";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db, campaignsTable, campaignRecipientsTable, usersTable, userProfileTable } from "@workspace/db";
import { requireAdmin, uid } from "../lib/auth";
import { emailHtml, mailConfigured, sendMail } from "../lib/mail";
import { setSetting } from "../lib/backup";
import {
  SEGMENTS,
  EMAILS_PER_HOUR,
  audienceCounts,
  buildEmail,
  buttonTarget,
  campaignStats,
  publicBase,
  readToken,
  runMarketing,
  startCampaign,
} from "../lib/marketing";

// ---------- public: opens, clicks, unsubscribe (signed links, no login) ----------
export const marketingPublicRouter = Router();

const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
const mark = (t: { campaignId: number; userId: number }, set: Partial<typeof campaignRecipientsTable.$inferInsert>, onlyIfNull: "openedAt" | "clickedAt" | "unsubscribedAt") =>
  db
    .update(campaignRecipientsTable)
    .set(set)
    .where(and(eq(campaignRecipientsTable.campaignId, t.campaignId), eq(campaignRecipientsTable.userId, t.userId), isNull(campaignRecipientsTable[onlyIfNull])));

marketingPublicRouter.get("/m/o/:token.gif", async (req, res) => {
  const t = readToken(req.params.token);
  if (t) await mark(t, { openedAt: new Date() }, "openedAt").catch(() => undefined);
  res.setHeader("Cache-Control", "no-store");
  res.type("gif").send(PIXEL);
});

marketingPublicRouter.get("/m/c/:token", async (req, res) => {
  const t = readToken(req.params.token);
  const base = await publicBase();
  if (!t) return void res.redirect(302, `${base}/today`);
  // A click also proves the email was opened (images are often blocked)
  await mark(t, { clickedAt: new Date() }, "clickedAt").catch(() => undefined);
  await mark(t, { openedAt: new Date() }, "openedAt").catch(() => undefined);
  const [c] = await db.select({ buttonUrl: campaignsTable.buttonUrl }).from(campaignsTable).where(eq(campaignsTable.id, t.campaignId));
  res.redirect(302, buttonTarget(c ?? { buttonUrl: null }, base));
});

async function unsubscribe(token: string) {
  const t = readToken(token);
  if (!t) return false;
  await db.update(usersTable).set({ marketing: false }).where(eq(usersTable.id, t.userId));
  await mark(t, { unsubscribedAt: new Date() }, "unsubscribedAt").catch(() => undefined);
  return true;
}
marketingPublicRouter.get("/m/u/:token", async (req, res) => {
  const ok = await unsubscribe(req.params.token);
  res.type("html").send(
    emailHtml({
      heading: ok ? "You're unsubscribed" : "That link didn't work",
      paragraphs: ok
        ? ["You won't get offers or news from Fitness Companion any more. Your reminders and weekly summary aren't affected.", "Changed your mind? Switch Offers and news back on in Me → Account & data."]
        : ["Open the app and switch Offers and news off in Me → Account & data."],
    }),
  );
});
// One-click unsubscribe from the mail app's own button (List-Unsubscribe-Post)
marketingPublicRouter.post("/m/u/:token", async (req, res) => {
  await unsubscribe(req.params.token);
  res.status(204).send();
});

// Cron backup for sending while the app is asleep (the 5-minute loop covers the rest)
marketingPublicRouter.get("/cron/marketing", async (req, res) => {
  if (!process.env.CRON_SECRET || req.query.key !== process.env.CRON_SECRET) return void res.status(403).json({ error: "Wrong or missing key" });
  res.json(await runMarketing());
});

// ---------- signed-in users: the in-app message ----------
export const messagesRouter = Router();

/** The newest in-app message for this person that they haven't dismissed or acted on. */
messagesRouter.get("/messages", async (req, res) => {
  const [me] = await db.select({ marketing: usersTable.marketing }).from(usersTable).where(eq(usersTable.id, uid(req)));
  if (!me?.marketing) return void res.json({ message: null });
  const [m] = await db
    .select({
      id: campaignsTable.id,
      title: campaignsTable.subject,
      name: campaignsTable.name,
      body: campaignsTable.body,
      buttonLabel: campaignsTable.buttonLabel,
      buttonUrl: campaignsTable.buttonUrl,
    })
    .from(campaignRecipientsTable)
    .innerJoin(campaignsTable, eq(campaignsTable.id, campaignRecipientsTable.campaignId))
    .where(
      and(
        eq(campaignRecipientsTable.userId, uid(req)),
        eq(campaignsTable.inApp, true),
        inArray(campaignsTable.status, ["sending", "sent"]),
        gt(campaignsTable.inAppUntil, new Date()),
        isNull(campaignRecipientsTable.dismissedAt),
        isNull(campaignRecipientsTable.clickedAt),
      ),
    )
    .orderBy(desc(campaignsTable.startedAt))
    .limit(1);
  if (!m) return void res.json({ message: null });
  const [p] = await db.select({ name: userProfileTable.name }).from(userProfileTable).where(eq(userProfileTable.userId, uid(req)));
  const first = p?.name?.trim().split(/\s+/)[0] || "there";
  const fill = (s: string) => s.replace(/\{\{\s*name\s*\}\}/gi, first);
  const paragraphs = fill(m.body).split(/\n\s*\n/).map((x) => x.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
  res.json({
    message: {
      id: m.id,
      title: fill(m.title || paragraphs[0] || m.name),
      body: m.title ? paragraphs.join("\n\n") : paragraphs.slice(1).join("\n\n"),
      buttonLabel: m.buttonLabel,
      // App pages stay inside the app; other addresses open outside it
      buttonUrl: m.buttonUrl,
    },
  });
});

messagesRouter.post("/messages/:id/:action", async (req, res) => {
  const col = { seen: "seenAt", click: "clickedAt", dismiss: "dismissedAt" }[req.params.action] as "seenAt" | "clickedAt" | "dismissedAt" | undefined;
  if (!col) return void res.status(400).json({ error: "Unknown action" });
  await db
    .update(campaignRecipientsTable)
    .set({ [col]: new Date() })
    .where(and(eq(campaignRecipientsTable.campaignId, Number(req.params.id)), eq(campaignRecipientsTable.userId, uid(req)), isNull(campaignRecipientsTable[col])));
  res.json({ ok: true });
});

// ---------- admin ----------
export const adminMarketingRouter = Router();
adminMarketingRouter.use("/admin/marketing", requireAdmin);

const FIELDS = ["name", "email", "push", "inApp", "audience", "subject", "body", "pushTitle", "pushBody", "buttonLabel", "buttonUrl"] as const;

function clean(b: Record<string, unknown>) {
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);
  const audience = (b.audience ?? {}) as { segment?: unknown; goal?: unknown };
  const segment = SEGMENTS.some((x) => x.id === audience.segment) ? String(audience.segment) : "all";
  const url = s(b.buttonUrl, 500)?.trim() || null;
  if (url && !/^(\/[\w\-/]*|https:\/\/\S+)$/i.test(url)) throw new Error("The button link must be an app page like /eat or start with https://");
  return {
    name: s(b.name, 120)?.trim() || "Untitled message",
    email: b.email === true,
    push: b.push === true,
    inApp: b.inApp === true,
    audience: { segment, goal: segment === "goal" && typeof audience.goal === "string" ? audience.goal : null },
    subject: s(b.subject, 150),
    body: s(b.body, 5000) ?? "",
    pushTitle: s(b.pushTitle, 60),
    pushBody: s(b.pushBody, 160),
    buttonLabel: s(b.buttonLabel, 40)?.trim() || null,
    buttonUrl: url,
  };
}

function problems(c: ReturnType<typeof clean>): string | null {
  if (!c.email && !c.push && !c.inApp) return "Pick at least one way to send it.";
  if (c.email && (!c.subject?.trim() || !c.body.trim())) return "Email needs a subject and a message.";
  if (c.push && !(c.pushTitle?.trim() || c.subject?.trim())) return "The phone notification needs a title.";
  if (c.inApp && !c.body.trim()) return "The in-app message needs some text.";
  return null;
}

adminMarketingRouter.get("/admin/marketing", async (req, res) => {
  const host = req.get("x-forwarded-host") ?? req.get("host");
  if (host && !/^(localhost|127\.)/.test(host)) {
    const proto = (req.get("x-forwarded-proto") ?? req.protocol).split(",")[0];
    void setSetting("app_origin", `${proto === "http" ? "https" : proto}://${host}`).catch(() => undefined);
  }
  const list = await db.select().from(campaignsTable).orderBy(desc(campaignsTable.createdAt)).limit(100);
  const stats = await campaignStats(list.map((c) => c.id));
  const goals = (await db.execute(sql`SELECT DISTINCT fitness_goal FROM ${userProfileTable} WHERE fitness_goal IS NOT NULL ORDER BY 1`)).rows.map((r) => (r as { fitness_goal: string }).fitness_goal);
  res.json({
    campaigns: list.map((c) => ({ ...c, stats: stats.get(c.id) ?? null })),
    segments: SEGMENTS,
    goals,
    emailOn: mailConfigured(),
    emailsPerHour: EMAILS_PER_HOUR(),
  });
});

adminMarketingRouter.post("/admin/marketing/audience", async (req, res) => {
  const c = clean({ audience: req.body?.audience });
  res.json(await audienceCounts(c.audience));
});

adminMarketingRouter.post("/admin/marketing", async (req, res) => {
  try {
    const [c] = await db.insert(campaignsTable).values(clean(req.body ?? {})).returning();
    res.status(201).json(c);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

adminMarketingRouter.put("/admin/marketing/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [c] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!c) return void res.status(404).json({ error: "Not found" });
  if (!["draft", "scheduled"].includes(c.status)) return void res.status(400).json({ error: "This message has already gone out." });
  try {
    const [u] = await db.update(campaignsTable).set({ ...clean(req.body ?? {}), updatedAt: new Date() }).where(eq(campaignsTable.id, id)).returning();
    res.json(u);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/** Send now, or schedule: { at?: ISO time } */
adminMarketingRouter.post("/admin/marketing/:id/send", async (req, res) => {
  const id = Number(req.params.id);
  const [c] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!c) return void res.status(404).json({ error: "Not found" });
  if (!["draft", "scheduled"].includes(c.status)) return void res.status(400).json({ error: "This message has already gone out." });
  const p = problems(clean(c as unknown as Record<string, unknown>));
  if (p) return void res.status(400).json({ error: p });
  const at = typeof req.body?.at === "string" ? new Date(req.body.at) : null;
  if (at && !Number.isNaN(at.getTime()) && at.getTime() > Date.now() + 60_000) {
    await db.update(campaignsTable).set({ status: "scheduled", scheduledAt: at, updatedAt: new Date() }).where(eq(campaignsTable.id, id));
    return void res.json({ status: "scheduled", at: at.toISOString() });
  }
  const people = await startCampaign(id);
  void runMarketing().catch(() => undefined);
  res.json({ status: "sending", people });
});

adminMarketingRouter.post("/admin/marketing/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  const [c] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!c) return void res.status(404).json({ error: "Not found" });
  if (c.status === "scheduled") {
    await db.update(campaignsTable).set({ status: "draft", scheduledAt: null, updatedAt: new Date() }).where(eq(campaignsTable.id, id));
  } else if (c.status === "sending") {
    // Stop what hasn't gone yet; the in-app card stops showing too
    await db.update(campaignRecipientsTable).set({ emailStatus: "skipped" }).where(and(eq(campaignRecipientsTable.campaignId, id), eq(campaignRecipientsTable.emailStatus, "pending")));
    await db.update(campaignRecipientsTable).set({ pushStatus: "skipped" }).where(and(eq(campaignRecipientsTable.campaignId, id), eq(campaignRecipientsTable.pushStatus, "pending")));
    await db.update(campaignsTable).set({ status: "cancelled", inAppUntil: new Date(), updatedAt: new Date() }).where(eq(campaignsTable.id, id));
  } else if (c.status === "sent" && c.inApp) {
    // Already sent: just stop showing the in-app card
    await db.update(campaignsTable).set({ inAppUntil: new Date(), updatedAt: new Date() }).where(eq(campaignsTable.id, id));
  }
  res.json({ ok: true });
});

adminMarketingRouter.post("/admin/marketing/:id/duplicate", async (req, res) => {
  const [c] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, Number(req.params.id)));
  if (!c) return void res.status(404).json({ error: "Not found" });
  const copy = Object.fromEntries(FIELDS.map((f) => [f, c[f]])) as ReturnType<typeof clean>;
  const [n] = await db.insert(campaignsTable).values({ ...copy, name: `${c.name} (copy)`.slice(0, 120) }).returning();
  res.status(201).json(n);
});

adminMarketingRouter.delete("/admin/marketing/:id", async (req, res) => {
  const [c] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, Number(req.params.id)));
  if (c && ["sending"].includes(c.status)) return void res.status(400).json({ error: "Cancel it first." });
  await db.delete(campaignsTable).where(eq(campaignsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

/** Email the message to the admin only, exactly as people will get it. */
adminMarketingRouter.post("/admin/marketing/test", async (req, res) => {
  if (!mailConfigured()) return void res.status(400).json({ error: "Email isn't set up on the server (SMTP settings), so a test can't be sent." });
  let c;
  try {
    c = clean(req.body ?? {});
  } catch (err) {
    return void res.status(400).json({ error: (err as Error).message });
  }
  if (!c.subject?.trim() || !c.body.trim()) return void res.status(400).json({ error: "Add a subject and a message first." });
  const base = await publicBase();
  const m = buildEmail({ ...c, id: 0 } as never, { id: 0, name: typeof req.body?.testName === "string" ? req.body.testName : null }, base, { test: true });
  const to = req.user!.email;
  const ok = await sendMail(to, m.subject, m.text, m.html);
  if (!ok) return void res.status(502).json({ error: "The email server refused it. Check the SMTP settings." });
  res.json({ sentTo: to });
});
