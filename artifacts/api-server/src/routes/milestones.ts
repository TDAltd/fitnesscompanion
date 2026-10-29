import { Router } from "express";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, milestonesTable } from "@workspace/db";
import { uid } from "../lib/auth";
import { milestonesFor } from "../lib/milestones";

const router = Router();

/** Every milestone with progress. "unseen" = earned but the pop-up hasn't been shown yet. */
router.get("/milestones", async (req, res) => {
  const list = await milestonesFor(uid(req));
  res.json({ milestones: list, unseen: list.filter((m) => m.earned && !m.seen).map((m) => m.key) });
});

/** Mark pop-ups as shown. POST /milestones/seen { keys: [...] } */
router.post("/milestones/seen", async (req, res) => {
  const keys = Array.isArray(req.body?.keys) ? req.body.keys.filter((k: unknown): k is string => typeof k === "string").slice(0, 50) : [];
  if (keys.length) {
    await db
      .update(milestonesTable)
      .set({ seenAt: new Date() })
      .where(and(eq(milestonesTable.userId, uid(req)), inArray(milestonesTable.key, keys), isNull(milestonesTable.seenAt)));
  }
  res.json({ ok: true });
});

export default router;
