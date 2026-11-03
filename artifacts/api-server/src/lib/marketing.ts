import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { db, campaignsTable, campaignRecipientsTable, usersTable, userProfileTable, pushSubscriptionsTable, type Audience } from "@workspace/db";
import { logger } from "./logger";
import { appUrl, emailHtml, mailConfigured, sendMail } from "./mail";
import { envAdmins } from "./auth";
import { sendToUser } from "./push";
import { getSetting } from "./backup";

/**
 * Marketing messages: who gets them, sending (email in small batches so the mailbox's hourly
 * limit isn't hit, notifications and in-app at once), and signed links for opens, clicks and
 * unsubscribing. People can switch it off (Me → Account) or unsubscribe from any email;
 * they're never messaged again until they switch it back on.
 */
type Campaign = typeof campaignsTable.$inferSelect;

export const EMAILS_PER_HOUR = () => Math.max(10, Number(process.env.MARKETING_EMAILS_PER_HOUR) || 150);

// ---------- who ----------

export const SEGMENTS: { id: string; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "active7", label: "Used the app in the last 7 days" },
  { id: "inactive14", label: "Haven't opened it for 14+ days" },
  { id: "new30", label: "Joined in the last 30 days" },
  { id: "goal", label: "By goal" },
  { id: "users", label: "Choose people" },
];

/** Everyone who can get marketing: not admins, not disabled, and haven't switched it off. */
export async function audienceUsers(a: Audience): Promise<{ id: number; email: string; name: string | null }[]> {
  const admins = envAdmins();
  const conds = [
    eq(usersTable.role, "user"),
    isNull(usersTable.disabledAt),
    eq(usersTable.marketing, true),
    admins.length ? sql`${usersTable.email} NOT IN (${sql.join(admins.map((e) => sql`${e}`), sql`, `)})` : sql`true`,
  ];
  if (a.segment === "active7") conds.push(sql`${usersTable.lastActiveAt} >= now() - interval '7 days'`);
  if (a.segment === "inactive14")
    conds.push(sql`(${usersTable.lastActiveAt} IS NULL OR ${usersTable.lastActiveAt} < now() - interval '14 days') AND ${usersTable.createdAt} < now() - interval '14 days'`);
  if (a.segment === "new30") conds.push(sql`${usersTable.createdAt} >= now() - interval '30 days'`);
  if (a.segment === "goal" && a.goal) conds.push(eq(userProfileTable.fitnessGoal, a.goal));
  if (a.segment === "users") conds.push(inArray(usersTable.id, a.userIds?.length ? a.userIds : [-1]));
  return db
    .select({ id: usersTable.id, email: usersTable.email, name: userProfileTable.name })
    .from(usersTable)
    .leftJoin(userProfileTable, eq(userProfileTable.userId, usersTable.id))
    .where(and(...conds));
}

export async function audienceCounts(a: Audience) {
  const people = await audienceUsers(a);
  const ids = people.map((p) => p.id);
  const withPush = ids.length
    ? ((await db.execute(sql`SELECT count(DISTINCT user_id)::int AS n FROM ${pushSubscriptionsTable} WHERE user_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`)).rows[0] as { n: number }).n
    : 0;
  const [{ off }] = (await db.execute(sql`SELECT count(*)::int AS off FROM ${usersTable} WHERE marketing = false AND role = 'user'`)).rows as { off: number }[];
  return { people: ids.length, withPush, optedOut: off };
}

// ---------- signed links ----------

const secret = () => process.env.CRON_SECRET || process.env.SMTP_PASS || "fitness-companion";
const mac = (c: number, u: number) => createHmac("sha256", secret()).update(`mkt:${c}:${u}`).digest("base64url").slice(0, 22);
export const linkToken = (c: number, u: number) => `${c}.${u}.${mac(c, u)}`;
export function readToken(t: string): { campaignId: number; userId: number } | null {
  const m = /^(\d+)\.(\d+)\.([\w-]{22})$/.exec(t);
  if (!m) return null;
  const [c, u] = [Number(m[1]), Number(m[2])];
  const a = Buffer.from(mac(c, u));
  const b = Buffer.from(m[3]);
  return a.length === b.length && timingSafeEqual(a, b) ? { campaignId: c, userId: u } : null;
}

/** Full public address for links in emails (learned from admin visits if APP_URL isn't set). */
export async function publicBase(): Promise<string> {
  const base = appUrl();
  if (/^https?:\/\//.test(base)) return base;
  return `${(await getSetting("app_origin")) ?? ""}${base}`;
}

/** Where the button goes: an app page ("/eat") or a full https address. */
export function buttonTarget(c: Pick<Campaign, "buttonUrl">, base: string): string {
  const u = (c.buttonUrl ?? "").trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${base}${u}`;
  return `${base}/today`;
}

// ---------- the message ----------

const firstName = (n: string | null | undefined) => (n?.trim().split(/\s+/)[0] || "there");
export const personalise = (text: string, name: string | null | undefined) => text.replace(/\{\{\s*name\s*\}\}/gi, firstName(name));

export function buildEmail(c: Campaign, person: { id: number; name: string | null }, base: string, opts: { test?: boolean } = {}) {
  const t = linkToken(c.id, person.id);
  const click = opts.test ? buttonTarget(c, base) : `${base}/api/m/c/${t}`;
  const unsub = opts.test ? `${base}/me` : `${base}/api/m/u/${t}`;
  const subject = `${opts.test ? "[TEST] " : ""}${personalise(c.subject || c.name, person.name)}`;
  const paragraphs = personalise(c.body, person.name)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  const heading = paragraphs.shift() ?? subject;
  const html = emailHtml({
    heading,
    paragraphs,
    button: c.buttonLabel ? { label: c.buttonLabel, url: click } : undefined,
    footer: `You're getting this because you use Fitness Companion. <a href="${unsub}" style="color:#6B827C">Unsubscribe from offers and news</a>.${
      opts.test ? "" : `<img src="${base}/api/m/o/${t}.gif" width="1" height="1" alt="" style="display:block;border:0">`
    }`,
  });
  const text = [heading, ...paragraphs, c.buttonLabel ? `${c.buttonLabel}: ${click}` : "", "", `Unsubscribe: ${unsub}`].filter((x) => x !== null).join("\n\n");
  const headers = opts.test ? undefined : { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
  return { subject, text, html, headers };
}

// ---------- sending ----------

/** Turn a due campaign into its list of people, then start sending. */
export async function startCampaign(id: number): Promise<number> {
  const [c] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!c || !["draft", "scheduled"].includes(c.status)) return 0;
  // Claim it so the 5-minute loop and the cron job don't both start it
  const claimed = await db
    .update(campaignsTable)
    .set({ status: "sending", startedAt: new Date(), updatedAt: new Date(), inAppUntil: c.inApp ? sql`now() + interval '7 days'` : null })
    .where(and(eq(campaignsTable.id, id), inArray(campaignsTable.status, ["draft", "scheduled"])))
    .returning();
  if (!claimed.length) return 0;
  const people = await audienceUsers(c.audience);
  for (let i = 0; i < people.length; i += 500) {
    await db
      .insert(campaignRecipientsTable)
      .values(people.slice(i, i + 500).map((p) => ({ campaignId: id, userId: p.id, emailStatus: c.email ? "pending" : "skipped", pushStatus: c.push ? "pending" : "skipped" })))
      .onConflictDoNothing();
  }
  logger.info({ campaign: id, people: people.length }, "campaign started");
  return people.length;
}

let running = false;

/** Called every 5 minutes: start what's due, send the next batch, close what's finished. */
export async function runMarketing(): Promise<{ started: number; emails: number; pushes: number }> {
  if (running) return { started: 0, emails: 0, pushes: 0 };
  running = true;
  try {
    let started = 0;
    const due = await db.select().from(campaignsTable).where(and(eq(campaignsTable.status, "scheduled"), lte(campaignsTable.scheduledAt, new Date())));
    for (const c of due) if ((await startCampaign(c.id)) >= 0) started++;

    const sending = await db.select().from(campaignsTable).where(eq(campaignsTable.status, "sending"));
    const base = await publicBase();
    let emails = 0;
    let pushes = 0;
    // A share of the hourly email budget per 5-minute run
    let budget = Math.ceil(EMAILS_PER_HOUR() / 12);

    for (const c of sending) {
      // Phone notifications: all at once
      if (c.push) {
        const batch = (
          await db.execute(sql`
            UPDATE ${campaignRecipientsTable} SET push_status = 'sending'
            WHERE (campaign_id, user_id) IN (
              SELECT campaign_id, user_id FROM ${campaignRecipientsTable}
              WHERE campaign_id = ${c.id} AND push_status = 'pending' LIMIT 1000 FOR UPDATE SKIP LOCKED)
            RETURNING user_id`)
        ).rows as { user_id: number }[];
        for (const { user_id } of batch) {
          const r = await sendToUser(user_id, {
            title: c.pushTitle || c.subject || c.name,
            body: c.pushBody || "",
            url: `/api/m/c/${linkToken(c.id, user_id)}`,
            tag: `campaign-${c.id}`,
          }).catch(() => ({ sent: 0, failed: 1 }));
          const status = r.sent > 0 ? "sent" : r.failed > 0 ? "failed" : "none";
          if (status === "sent") pushes++;
          await db.update(campaignRecipientsTable).set({ pushStatus: status }).where(and(eq(campaignRecipientsTable.campaignId, c.id), eq(campaignRecipientsTable.userId, user_id)));
        }
      }
      // Email: a small batch each run
      if (c.email && budget > 0 && mailConfigured()) {
        const batch = (
          await db.execute(sql`
            UPDATE ${campaignRecipientsTable} SET email_status = 'sending'
            WHERE (campaign_id, user_id) IN (
              SELECT campaign_id, user_id FROM ${campaignRecipientsTable}
              WHERE campaign_id = ${c.id} AND email_status = 'pending' LIMIT ${budget} FOR UPDATE SKIP LOCKED)
            RETURNING user_id`)
        ).rows as { user_id: number }[];
        budget -= batch.length;
        if (batch.length) {
          const people = await db
            .select({ id: usersTable.id, email: usersTable.email, name: userProfileTable.name, marketing: usersTable.marketing })
            .from(usersTable)
            .leftJoin(userProfileTable, eq(userProfileTable.userId, usersTable.id))
            .where(inArray(usersTable.id, batch.map((b) => b.user_id)));
          for (const p of people) {
            let status = "skipped";
            if (p.marketing) {
              const m = buildEmail(c, p, base);
              status = (await sendMail(p.email, m.subject, m.text, m.html, m.headers)) ? "sent" : "failed";
              if (status === "sent") emails++;
            }
            await db
              .update(campaignRecipientsTable)
              .set({ emailStatus: status, emailSentAt: status === "sent" ? new Date() : null })
              .where(and(eq(campaignRecipientsTable.campaignId, c.id), eq(campaignRecipientsTable.userId, p.id)));
          }
        }
      }
      // Finished when nothing is waiting on any channel
      const [{ waiting }] = (
        await db.execute(sql`SELECT count(*)::int AS waiting FROM ${campaignRecipientsTable}
          WHERE campaign_id = ${c.id} AND (email_status IN ('pending','sending') OR push_status IN ('pending','sending'))`)
      ).rows as { waiting: number }[];
      // Email can't go out without a mailbox: don't hold the campaign open forever
      const blocked = c.email && !mailConfigured();
      if (waiting === 0 || (blocked && !c.push)) {
        if (blocked) await db.update(campaignRecipientsTable).set({ emailStatus: "failed" }).where(and(eq(campaignRecipientsTable.campaignId, c.id), eq(campaignRecipientsTable.emailStatus, "pending")));
        await db.update(campaignsTable).set({ status: "sent", sentAt: new Date(), updatedAt: new Date() }).where(eq(campaignsTable.id, c.id));
      }
    }
    // Rows stuck in 'sending' after a restart go back in the queue
    await db.execute(sql`UPDATE ${campaignRecipientsTable} r SET email_status = 'pending'
      FROM ${campaignsTable} c WHERE c.id = r.campaign_id AND c.status = 'sending' AND r.email_status = 'sending' AND c.updated_at < now() - interval '30 minutes'`);
    return { started, emails, pushes };
  } finally {
    running = false;
  }
}

/** Results for the admin list and detail. */
export async function campaignStats(ids: number[]) {
  if (!ids.length) return new Map<number, Record<string, number>>();
  const rows = (
    await db.execute(sql`
      SELECT campaign_id,
        count(*)::int AS people,
        count(*) FILTER (WHERE email_status = 'sent')::int AS email_sent,
        count(*) FILTER (WHERE email_status IN ('pending','sending'))::int AS email_waiting,
        count(*) FILTER (WHERE email_status = 'failed')::int AS email_failed,
        count(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened,
        count(*) FILTER (WHERE push_status = 'sent')::int AS push_sent,
        count(*) FILTER (WHERE push_status = 'none')::int AS push_no_device,
        count(*) FILTER (WHERE seen_at IS NOT NULL)::int AS seen,
        count(*) FILTER (WHERE clicked_at IS NOT NULL)::int AS clicked,
        count(*) FILTER (WHERE dismissed_at IS NOT NULL)::int AS dismissed,
        count(*) FILTER (WHERE unsubscribed_at IS NOT NULL)::int AS unsubscribed
      FROM ${campaignRecipientsTable}
      WHERE campaign_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})
      GROUP BY campaign_id`)
  ).rows as ({ campaign_id: number } & Record<string, number>)[];
  return new Map(rows.map(({ campaign_id, ...r }) => [campaign_id, r]));
}
