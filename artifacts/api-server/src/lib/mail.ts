import nodemailer, { type Transporter } from "nodemailer";
import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "./logger";
import { BASE_PATH } from "./config";

/**
 * Email through an SMTP mailbox (e.g. a cPanel email account).
 * Set SMTP_HOST, SMTP_PORT (465 or 587), SMTP_USER, SMTP_PASS and MAIL_FROM.
 * APP_URL is the public address, e.g. https://tdaproducthub.com/fitnesscompanion
 */
let transporter: Transporter | null = null;

export const mailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

function transport(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendMail(to: string, subject: string, text: string, html: string): Promise<boolean> {
  if (!mailConfigured()) {
    logger.warn({ to, subject }, "email not sent: SMTP is not configured");
    return false;
  }
  try {
    await transport().sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
    return true;
  } catch (err) {
    logger.error({ err, to, subject }, "email failed");
    return false;
  }
}

/** Public address of the app, without a trailing slash. */
export function appUrl(req?: { protocol: string; get(name: string): string | undefined }): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  if (req) return `${req.protocol}://${req.get("host")}${BASE_PATH}`;
  return BASE_PATH;
}

// ---------- signed unsubscribe links ----------

const secret = () => process.env.CRON_SECRET || process.env.SMTP_PASS || "fitness-companion";
const sign = (userId: number) => createHmac("sha256", secret()).update(`unsub:${userId}`).digest("base64url").slice(0, 32);

export const unsubscribeToken = (userId: number) => sign(userId);
export function checkUnsubscribe(userId: number, token: string): boolean {
  const a = Buffer.from(sign(userId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** A simple branded HTML email: heading, paragraphs (plain text), optional button and footer. */
export function emailHtml(opts: { heading: string; paragraphs: string[]; button?: { label: string; url: string }; rows?: [string, string][]; footer?: string }) {
  const rows = opts.rows?.length
    ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin:8px 0 20px">${opts.rows
        .map(([k, v]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #E3ECE7;color:#4B6660">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #E3ECE7;text-align:right;font-weight:600;color:#173A33">${esc(v)}</td></tr>`)
        .join("")}</table>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#F2F6F4;font-family:'Nunito Sans',Arial,sans-serif;color:#173A33">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="margin:0 0 20px;font-weight:700;color:#2E7D6B;letter-spacing:.02em">Fitness Companion</p>
<div style="background:#fff;border-radius:16px;padding:28px">
<h1 style="margin:0 0 14px;font-size:22px;font-weight:600">${esc(opts.heading)}</h1>
${opts.paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.55">${esc(p)}</p>`).join("")}
${rows}
${opts.button ? `<p style="margin:22px 0 6px"><a href="${esc(opts.button.url)}" style="display:inline-block;background:#2E7D6B;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">${esc(opts.button.label)}</a></p>` : ""}
</div>
${opts.footer ? `<p style="margin:18px 4px 0;font-size:12px;color:#6B827C;line-height:1.5">${opts.footer}</p>` : ""}
</div></body></html>`;
}
