// Production migration runner for the private area (Neon Postgres).
// Run manually, NEVER as part of a request or an automatic preview build:
//   DATABASE_URL_UNPOOLED=... CONFIRM_PRODUCTION_MIGRATION=yes \
//     pnpm --filter @workspace/private-dashboard migrate:production
// Use a direct (non-pooled) connection with a dedicated migration role.
import pg from "pg";
import fs from "node:fs/promises";
import crypto from "node:crypto";

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED (direct, non-pooled connection) is required.");
if (new URL(url).hostname.includes("-pooler")) throw new Error("DATABASE_URL_UNPOOLED points to a pooled host. Use the direct connection.");
if (process.env.CONFIRM_PRODUCTION_MIGRATION !== "yes") throw new Error("Set CONFIRM_PRODUCTION_MIGRATION=yes to run migrations.");

const dir = new URL("../migrations/", import.meta.url);
const files = (await fs.readdir(dir)).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
const LOCK_ID = 7_345_001; // arbitrary constant; one runner at a time

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  // Session-level advisory lock: a second parallel run waits and then sees all work done.
  await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID]);
  await client.query("CREATE SCHEMA IF NOT EXISTS private_area");
  await client.query(`CREATE TABLE IF NOT EXISTS private_area.schema_migrations (
    name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
  const applied = new Map((await client.query("SELECT name, checksum FROM private_area.schema_migrations")).rows.map((r) => [r.name, r.checksum]));

  for (const name of applied.keys()) {
    if (!files.includes(name)) throw new Error(`Applied migration ${name} is missing from the repository.`);
  }
  for (const name of files) {
    const sql = await fs.readFile(new URL(name, dir), "utf8");
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");
    if (applied.has(name)) {
      if (applied.get(name) !== checksum) throw new Error(`Checksum mismatch for ${name}: applied migrations must not be edited.`);
      console.log(`skip   ${name}`);
      continue;
    }
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO private_area.schema_migrations(name, checksum) VALUES ($1,$2)", [name, checksum]);
      await client.query("COMMIT");
      console.log(`apply  ${name}`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  }
  console.log("Migrations up to date.");
} finally {
  await client.end();
}
