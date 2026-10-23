// Run only from a trusted administrative terminal. Never add an HTTP bootstrap.
import pg from "pg";
import { randomBytes, randomUUID, createHash } from "node:crypto";
const mode=process.env.AUTH_ENVIRONMENT;
const rawOrigin=mode==="production"?process.env.PRIVATE_APP_ORIGIN:mode==="preview"?process.env.PREVIEW_AUTH_ORIGIN:undefined;
if(!rawOrigin) throw new Error("Configure the exact auth origin before bootstrap.");
const origin=new URL(rawOrigin);
if(origin.protocol!=="https:" || origin.origin!==rawOrigin || (mode==="production" && origin.hostname.endsWith(".replit.dev"))) throw new Error("Exact HTTPS production/preview origin required.");
const name=process.argv[2];
if(!name || name.length>100) throw new Error("Usage: node scripts/bootstrap.mjs 'Administrator name'");
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const c=await pool.connect();
try {
  await c.query("BEGIN");
  // Atomic permanent sentinel; no rerun after first creation, even if invitation expires.
  await c.query("INSERT INTO private_area.bootstrap(id) VALUES(1)");
  const existing=await c.query("SELECT id FROM private_area.users WHERE role='admin'");
  if(existing.rowCount) throw new Error("An administrator already exists.");
  const token=randomBytes(32).toString("base64url"), hash=createHash("sha256").update(token).digest("hex");
  await c.query("INSERT INTO private_area.invitations(id,token_hash,name,role,expires_at) VALUES($1,$2,$3,'admin',now()+interval '1 hour')",[randomUUID(),hash,name]);
  await c.query("COMMIT");
  process.stdout.write(`One-time invitation (sensitive; do not log or commit):\n${origin.origin}${(process.env.BASE_PATH??"").replace(/\/$/,"")}/invite#token=${token}\n`);
} catch(e) { await c.query("ROLLBACK"); throw e; }
finally { c.release(); await pool.end(); }
