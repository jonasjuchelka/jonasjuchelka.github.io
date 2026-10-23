import "server-only";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PoolClient } from "pg";

const globalDb = globalThis as unknown as { privatePool?: pg.Pool };
export function pool() {
  if (!process.env.DATABASE_URL) throw new Error("Private database not configured");
  return globalDb.privatePool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    // Serverless-friendly: release idle connections quickly and fail fast (Neon may need a moment to wake up).
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });
}
// Drizzle is available for typed schema queries; transactions use the same pg pool.
export function database() { return drizzle(pool()); }
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params: unknown[] = []) {
  return (await pool().query<T>(sql, params)).rows;
}
export async function transaction<T>(fn: (c: PoolClient) => Promise<T>) {
  const c = await pool().connect();
  try { await c.query("BEGIN"); const result = await fn(c); await c.query("COMMIT"); return result; }
  catch (e) { await c.query("ROLLBACK"); throw e; }
  finally { c.release(); }
}
