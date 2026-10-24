import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  createSession,
  destroySession,
  getSessionUser,
  hashPassword,
  rateLimit,
  signupsOpen,
  verifyPassword,
  isAdminUser,
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

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists. Log in instead." });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash: await hashPassword(password) })
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

export default router;
