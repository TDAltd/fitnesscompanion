import { Router, raw } from "express";
import { requireAdmin } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  BACKUP_DIR,
  backupKey,
  getSetting,
  keyMatches,
  makeBackup,
  readBackup,
  readServerCopy,
  restoreDump,
  saveServerCopy,
  serverCopies,
  setSetting,
} from "../lib/backup";

/**
 * Nightly pull from GitHub Actions (.github/workflows/backup.yml):
 *   curl -H "x-backup-key: $BACKUP_KEY" https://tdaproducthub.com/fitnesscompanion/api/cron/backup -o backup.fcbk
 * The same key unlocks the file, so it's the only secret needed.
 */
export const backupCronRouter = Router();
backupCronRouter.get("/cron/backup", async (req, res) => {
  const key = await backupKey();
  if (!keyMatches(key, req.get("x-backup-key") ?? req.query.key)) {
    res.status(403).json({ error: "Wrong or missing backup key" });
    return;
  }
  const b = await makeBackup();
  await saveServerCopy(b).catch((err) => logger.warn({ err: (err as Error).message }, "server copy failed"));
  await setSetting("backup_last_offsite", new Date().toISOString());
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${b.name}"`);
  res.setHeader("X-Backup-Rows", String(b.rows));
  res.send(b.file);
});

export const adminBackupRouter = Router();
adminBackupRouter.use("/admin/backups", requireAdmin);

adminBackupRouter.get("/admin/backups", async (_req, res) => {
  res.json({
    lastServer: await getSetting("backup_last_server"),
    lastOffsite: await getSetting("backup_last_offsite"),
    lastRestore: await getSetting("backup_last_restore"),
    folder: BACKUP_DIR,
    copies: await serverCopies(),
  });
});

adminBackupRouter.get("/admin/backups/key", async (_req, res) => {
  res.json({ key: await backupKey() });
});

adminBackupRouter.post("/admin/backups/now", async (_req, res) => {
  const r = await saveServerCopy();
  res.json(r);
});

adminBackupRouter.get("/admin/backups/file/:name", async (req, res) => {
  const file = await readServerCopy(req.params.name);
  if (!file) {
    res.status(404).json({ error: "No such backup." });
    return;
  }
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.name}"`);
  res.send(file);
});

/** Body: the .fcbk file. Headers: x-backup-key (the key it was locked with), x-confirm: RESTORE. */
adminBackupRouter.post("/admin/backups/restore", raw({ type: () => true, limit: "200mb" }), async (req, res) => {
  if (req.get("x-confirm") !== "RESTORE") {
    res.status(400).json({ error: "Type RESTORE to confirm." });
    return;
  }
  const key = req.get("x-backup-key") ?? "";
  let dump;
  try {
    dump = await readBackup(req.body as Buffer, key);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }
  // Safety copy of what's there now, so a restore can itself be undone
  const safety = await saveServerCopy().catch(() => null);
  const keepTimes = { server: await getSetting("backup_last_server"), offsite: await getSetting("backup_last_offsite") };
  const r = await restoreDump(dump);
  // The backup brings its own older settings; keep the real "last backup" times
  if (keepTimes.server) await setSetting("backup_last_server", keepTimes.server);
  if (keepTimes.offsite) await setSetting("backup_last_offsite", keepTimes.offsite);
  await setSetting("backup_last_restore", JSON.stringify({ at: new Date().toISOString(), from: dump.createdAt, safety: safety?.name ?? null }));
  logger.warn({ ...r, from: dump.createdAt }, "database restored from backup");
  res.json({ ...r, from: dump.createdAt, safetyCopy: safety?.name ?? null });
});
