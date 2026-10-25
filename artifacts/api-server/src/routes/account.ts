import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { destroySession, uid, verifyPassword, rateLimit } from "../lib/auth";
import { mailConfigured } from "../lib/mail";

/** The signed-in person's own account: email preferences and deleting the account. */
const router = Router();

router.get("/account/settings", async (req, res) => {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, uid(req)));
  res.json({ email: u.email, weeklyEmail: u.weeklyEmail, emailEnabled: mailConfigured(), consentAt: u.consentAt?.toISOString() ?? null });
});

router.put("/account/settings", async (req, res) => {
  const weeklyEmail = req.body?.weeklyEmail;
  if (typeof weeklyEmail !== "boolean") {
    res.status(400).json({ error: "weeklyEmail must be true or false." });
    return;
  }
  await db.update(usersTable).set({ weeklyEmail }).where(eq(usersTable.id, uid(req)));
  res.json({ weeklyEmail });
});

/** Permanently deletes the account and all its data (every table cascades on user_id). */
router.delete("/account", async (req, res) => {
  const userId = uid(req);
  if (req.user?.isAdmin) {
    res.status(403).json({ error: "Admin accounts can't be deleted here. Remove admin access first." });
    return;
  }
  if (!rateLimit(`delete-account:${userId}`, 5, 15 * 60 * 1000)) {
    res.status(429).json({ error: "Too many attempts. Wait 15 minutes and try again." });
    return;
  }
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!u || !(await verifyPassword(password, u.passwordHash))) {
    res.status(401).json({ error: "That password isn't right." });
    return;
  }
  await destroySession(req, res);
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  req.log.info({ user: userId }, "user deleted own account");
  res.status(204).send();
});

export default router;
