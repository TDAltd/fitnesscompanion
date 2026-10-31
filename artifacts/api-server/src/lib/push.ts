import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { db, appSettingsTable, pushSubscriptionsTable } from "@workspace/db";
import { logger } from "./logger";

/**
 * Web push (notifications from the app itself, no calendar needed).
 * Keys come from VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY if set; otherwise a pair is made once
 * and kept in app_settings, so nothing has to be configured in cPanel.
 */
let keys: { publicKey: string; privateKey: string } | null = null;

export async function vapidKeys() {
  if (keys) return keys;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    const rows = await db.select().from(appSettingsTable).where(inArray(appSettingsTable.key, ["vapid_public", "vapid_private"]));
    const pub = rows.find((r) => r.key === "vapid_public")?.value;
    const priv = rows.find((r) => r.key === "vapid_private")?.value;
    if (pub && priv) {
      keys = { publicKey: pub, privateKey: priv };
    } else {
      const made = webpush.generateVAPIDKeys();
      // First writer wins if two processes start at once
      await db.insert(appSettingsTable).values([
        { key: "vapid_public", value: made.publicKey },
        { key: "vapid_private", value: made.privateKey },
      ]).onConflictDoNothing();
      const again = await db.select().from(appSettingsTable).where(inArray(appSettingsTable.key, ["vapid_public", "vapid_private"]));
      keys = { publicKey: again.find((r) => r.key === "vapid_public")!.value, privateKey: again.find((r) => r.key === "vapid_private")!.value };
    }
  }
  const contact = process.env.MAIL_FROM?.match(/[\w.+-]+@[\w.-]+/)?.[0] ?? process.env.SMTP_USER ?? "admin@example.com";
  webpush.setVapidDetails(`mailto:${contact}`, keys.publicKey, keys.privateKey);
  return keys;
}

export type PushMessage = {
  title: string;
  body: string;
  /** Path inside the app to open, e.g. "/today" */
  url: string;
  /** Same tag replaces an older notification instead of stacking */
  tag: string;
  actions?: { action: string; title: string }[];
};

/** Send to every device a person has. Dead subscriptions (uninstalled, permission removed) are deleted. */
export async function sendToUser(userId: number, msg: PushMessage): Promise<{ sent: number; failed: number }> {
  await vapidKeys();
  const subs = await db.select().from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, userId));
  let sent = 0;
  let failed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), {
        TTL: 60 * 60, // a reminder that's an hour late isn't useful
        urgency: "normal",
        timeout: 10_000,
      });
      sent++;
      await db.update(pushSubscriptionsTable).set({ lastSentAt: new Date() }).where(eq(pushSubscriptionsTable.id, s.id));
    } catch (err) {
      failed++;
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, s.id));
      } else {
        logger.warn({ err: (err as Error).message, status, userId }, "push send failed");
      }
    }
  }
  return { sent, failed };
}
