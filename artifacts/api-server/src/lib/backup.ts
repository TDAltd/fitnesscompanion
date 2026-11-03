import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { mkdir, readdir, stat, writeFile, unlink, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";
import { logger } from "./logger";

/**
 * Whole-database backup.
 *
 * Every table is written to JSON, gzipped, then locked with AES-256-GCM using the backup key
 * (made once and shown in Admin → Backups). Files look like:
 *   "FCBK1" | salt (16) | iv (12) | tag (16) | encrypted gzip
 * Without the key the file is unreadable, so a copy can safely sit in GitHub.
 *
 * Copies: the nightly GitHub job downloads one (kept 14 days there), and the server keeps its own
 * last 14 in ~/fitness-backups, outside the public website folder.
 */
const MAGIC = Buffer.from("FCBK1");
const KEEP = 14;
export const BACKUP_DIR = process.env.BACKUP_DIR || path.join(homedir(), "fitness-backups");

export async function backupKey(): Promise<string> {
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "backup_key"));
  if (row?.value) return row.value;
  const key = `fcb_${randomBytes(24).toString("base64url")}`;
  await db.insert(appSettingsTable).values({ key: "backup_key", value: key }).onConflictDoNothing();
  const [again] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "backup_key"));
  return again!.value;
}

export function keyMatches(expected: string, given: unknown): boolean {
  if (typeof given !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

export function encrypt(plain: Buffer, key: string): Buffer {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const k = scryptSync(key, salt, 32);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([MAGIC, salt, iv, c.getAuthTag(), body]);
}

export function decrypt(file: Buffer, key: string): Buffer {
  if (!file.subarray(0, 5).equals(MAGIC)) throw new Error("Not a Fitness Companion backup file.");
  const salt = file.subarray(5, 21);
  const iv = file.subarray(21, 33);
  const tag = file.subarray(33, 49);
  const d = createDecipheriv("aes-256-gcm", scryptSync(key.trim(), salt, 32), iv);
  d.setAuthTag(tag);
  try {
    return Buffer.concat([d.update(file.subarray(49)), d.final()]);
  } catch {
    throw new Error("Wrong backup key, or the file is damaged.");
  }
}

type Dump = { format: "fitness-companion-db"; version: 1; createdAt: string; tables: Record<string, unknown[]> };

/** Every table in the database except the migration log. */
export async function dumpDatabase(): Promise<Dump> {
  const list = await db.execute(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`);
  const tables: Record<string, unknown[]> = {};
  for (const { table_name } of list.rows as { table_name: string }[]) {
    if (table_name.startsWith("__drizzle")) continue;
    // to_jsonb keeps exact Postgres values (dates, arrays, jsonb) so restore puts back the same thing
    const rows = await db.execute(sql`SELECT to_jsonb(t) AS r FROM ${sql.identifier(table_name)} t`);
    tables[table_name] = (rows.rows as { r: unknown }[]).map((x) => x.r);
  }
  return { format: "fitness-companion-db", version: 1, createdAt: new Date().toISOString(), tables };
}

export async function makeBackup(): Promise<{ file: Buffer; name: string; rows: number; tables: number }> {
  const dump = await dumpDatabase();
  const key = await backupKey();
  const file = encrypt(gzipSync(Buffer.from(JSON.stringify(dump))), key);
  const stamp = dump.createdAt.slice(0, 23).replace(/[:T.]/g, "-");
  const rows = Object.values(dump.tables).reduce((n, t) => n + t.length, 0);
  return { file, name: `fitness-companion-${stamp}.fcbk`, rows, tables: Object.keys(dump.tables).length };
}

export async function readBackup(file: Buffer, key: string): Promise<Dump> {
  const dump = JSON.parse(gunzipSync(decrypt(file, key)).toString("utf8")) as Dump;
  if (dump.format !== "fitness-companion-db") throw new Error("Not a Fitness Companion database backup.");
  return dump;
}

/** Save a copy on the server and keep only the newest 14. */
export async function saveServerCopy(made?: Awaited<ReturnType<typeof makeBackup>>): Promise<{ name: string; bytes: number; rows: number }> {
  const b = made ?? (await makeBackup());
  await mkdir(BACKUP_DIR, { recursive: true, mode: 0o700 });
  await writeFile(path.join(BACKUP_DIR, b.name), b.file, { mode: 0o600 });
  const files = (await serverCopies()).slice(KEEP);
  for (const f of files) await unlink(path.join(BACKUP_DIR, f.name)).catch(() => undefined);
  await setSetting("backup_last_server", new Date().toISOString());
  return { name: b.name, bytes: b.file.length, rows: b.rows };
}

export async function serverCopies(): Promise<{ name: string; bytes: number; at: string }[]> {
  try {
    const names = (await readdir(BACKUP_DIR)).filter((n) => n.endsWith(".fcbk"));
    const out = await Promise.all(
      names.map(async (name) => {
        const s = await stat(path.join(BACKUP_DIR, name));
        return { name, bytes: s.size, at: s.mtime.toISOString() };
      }),
    );
    return out.sort((a, b) => b.at.localeCompare(a.at));
  } catch {
    return [];
  }
}

export async function readServerCopy(name: string): Promise<Buffer | null> {
  if (!/^fitness-companion-[\d-]+\.fcbk$/.test(name)) return null;
  return readFile(path.join(BACKUP_DIR, name)).catch(() => null);
}

export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
  return row?.value ?? null;
}
export async function setSetting(key: string, value: string) {
  await db.insert(appSettingsTable).values({ key, value }).onConflictDoUpdate({ target: appSettingsTable.key, set: { value } });
}

/** Called from the 5-minute loop: make the server copy once a day, even if the GitHub job isn't set up. */
export async function dailyServerBackup() {
  const last = await getSetting("backup_last_server");
  if (last && Date.now() - Date.parse(last) < 23 * 60 * 60 * 1000) return;
  const r = await saveServerCopy();
  logger.info(r, "server backup saved");
}

/** Tables ordered so a table comes after every table it points to (foreign keys). */
async function insertOrder(names: string[]): Promise<string[]> {
  const fks = await db.execute(sql`
    SELECT cl.relname AS child, pr.relname AS parent
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_class pr ON pr.oid = c.confrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE c.contype = 'f' AND n.nspname = 'public'`);
  const parents = new Map<string, Set<string>>(names.map((n) => [n, new Set()]));
  for (const { child, parent } of fks.rows as { child: string; parent: string }[]) {
    if (child !== parent && parents.has(child) && parents.has(parent)) parents.get(child)!.add(parent);
  }
  const done: string[] = [];
  const seen = new Set<string>();
  const visit = (n: string) => {
    if (seen.has(n)) return;
    seen.add(n);
    for (const p of parents.get(n) ?? []) visit(p);
    done.push(n);
  };
  names.forEach(visit);
  return done;
}

/**
 * Put a backup back. Replaces everything in every table the backup contains, in one transaction:
 * if anything fails, nothing changes. Tables that exist now but not in the backup are left alone.
 */
export async function restoreDump(dump: Dump): Promise<{ tables: number; rows: number }> {
  const existing = new Set(
    ((await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`)).rows as { table_name: string }[]).map((r) => r.table_name),
  );
  const names = Object.keys(dump.tables).filter((n) => existing.has(n) && !n.startsWith("__drizzle"));
  const order = await insertOrder(names);
  let rows = 0;
  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`TRUNCATE ${order.map((n) => `"${n.replace(/"/g, '""')}"`).join(", ")} RESTART IDENTITY CASCADE`));
    for (const name of order) {
      const data = dump.tables[name];
      for (let i = 0; i < data.length; i += 500) {
        const chunk = data.slice(i, i + 500);
        await tx.execute(
          sql`INSERT INTO ${sql.identifier(name)} SELECT * FROM jsonb_populate_recordset(NULL::${sql.identifier(name)}, ${JSON.stringify(chunk)}::jsonb)`,
        );
        rows += chunk.length;
      }
      // Move id counters past the restored rows so new rows don't clash
      const serials = await tx.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${name} AND column_default LIKE 'nextval(%'`);
      for (const { column_name } of serials.rows as { column_name: string }[]) {
        await tx.execute(sql`
          SELECT setval(pg_get_serial_sequence(${`"${name}"`}, ${column_name}),
                        COALESCE((SELECT max(${sql.identifier(column_name)}) FROM ${sql.identifier(name)}), 1),
                        (SELECT max(${sql.identifier(column_name)}) FROM ${sql.identifier(name)}) IS NOT NULL)`);
      }
    }
  });
  return { tables: order.length, rows };
}
