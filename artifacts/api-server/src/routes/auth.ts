import { Router } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db, passwordResetsTable, sessionsTable, usersTable } from "@workspace/db";
import { appUrl, emailHtml, mailConfigured, sendMail } from "../lib/mail";
import {
  createSession,
  destroySession,
  getSessionUser,
  hashPassword,
  rateLimit,
  signupsOpen,
  verifyPassword,
  isAdminUser,
  hashToken,
} from "../lib/auth";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readCredentials(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  return { email, password };
}

router.post("/auth/signup", async (req, res) => {
  if (!(await signupsOpen())) {
    res.status(403).json({ error: "New sign-ups are closed." });
    return;
  }
  if (!rateLimit(`signup:${req.ip}`, 10, 60 * 60 * 1000)) {
    res.status(429).json({ error: "Too many sign-ups from this network. Try again later." });
    return;
  }
  const { email, password } = readCredentials(req.body);
  if (!EMAIL_RE.test(email) || email.length > 200) {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }
  if (password.length < 8 || password.length > 200) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }

  if ((req.body as Record<string, unknown>)?.consent !== true) {
    res.status(400).json({ error: "Please agree to the privacy notice to create an account." });
    return;
  }

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists. Log in instead." });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash: await hashPassword(password), consentAt: new Date() })
    .returning({ id: usersTable.id, email: usersTable.email, role: usersTable.role });

  await createSession(res, user.id, req.secure);
  res.status(201).json({ id: user.id, email: user.email, isAdmin: isAdminUser(user) });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = readCredentials(req.body);
  if (!rateLimit(`login:${req.ip}:${email}`, 10, 15 * 60 * 1000)) {
    res.status(429).json({ error: "Too many attempts. Wait 15 minutes and try again." });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }
  if (user.disabledAt) {
    res.status(403).json({ error: "This account has been disabled. Contact the app owner." });
    return;
  }
  await createSession(res, user.id, req.secure);
  res.json({ id: user.id, email: user.email, isAdmin: isAdminUser(user) });
});

router.post("/auth/logout", async (req, res) => {
  await destroySession(req, res);
  res.status(204).send();
});

router.get("/auth/me", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user || user.disabled) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }
  res.json({ id: user.id, email: user.email, isAdmin: user.isAdmin });
});

/** What the login screen needs to know before anyone is signed in. */
router.get("/auth/config", async (_req, res) => {
  res.json({ signupsOpen: await signupsOpen(), emailEnabled: mailConfigured() });
});

const RESET_MINUTES = 60;

/** Sends a reset link. Always answers the same way so it can't be used to discover accounts. */
router.post("/auth/forgot", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const done = () => res.json({ ok: true });
  if (!rateLimit(`forgot:${req.ip}`, 5, 60 * 60 * 1000) || !rateLimit(`forgot:${email}`, 3, 60 * 60 * 1000)) {
    res.status(429).json({ error: "Too many requests. Try again in an hour." });
    return;
  }
  if (!EMAIL_RE.test(email)) return void done();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || user.disabledAt) return void done();

  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResetsTable).values({
    id: hashToken(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000),
  });
  const link = `${appUrl(req)}/reset-password?token=${token}`;
  await sendMail(
    user.email,
    "Reset your Fitness Companion password",
    `Someone asked to reset the password for this account. Open this link within an hour to choose a new one:\n\n${link}\n\nIf it wasn't you, ignore this email; your password stays the same.`,
    emailHtml({
      heading: "Reset your password",
      paragraphs: [
        "Someone asked to reset the password for your Fitness Companion account. The link works for one hour.",
        "If it wasn't you, ignore this email; your password stays the same.",
      ],
      button: { label: "Choose a new password", url: link },
    }),
  );
  done();
});

router.post("/auth/reset", async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!rateLimit(`reset:${req.ip}`, 10, 15 * 60 * 1000)) {
    res.status(429).json({ error: "Too many attempts. Try again later." });
    return;
  }
  if (password.length < 8 || password.length > 200) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }
  const [reset] = token
    ? await db
        .select()
        .from(passwordResetsTable)
        .where(and(eq(passwordResetsTable.id, hashToken(token)), isNull(passwordResetsTable.usedAt), gt(passwordResetsTable.expiresAt, new Date())))
    : [];
  if (!reset) {
    res.status(400).json({ error: "This reset link has expired or was already used. Ask for a new one." });
    return;
  }
  await db.update(passwordResetsTable).set({ usedAt: new Date() }).where(eq(passwordResetsTable.id, reset.id));
  await db.update(usersTable).set({ passwordHash: await hashPassword(password) }).where(eq(usersTable.id, reset.userId));
  // Sign out everywhere else, then sign in here
  await db.delete(sessionsTable).where(eq(sessionsTable.userId, reset.userId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, reset.userId));
  if (user.disabledAt) {
    res.status(403).json({ error: "This account has been disabled. Contact the app owner." });
    return;
  }
  await createSession(res, user.id, req.secure);
  res.json({ id: user.id, email: user.email, isAdmin: isAdminUser(user) });
});

export default router;
