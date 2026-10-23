import pg from "pg";
import fs from "node:fs/promises";
if(process.env.NODE_ENV==="production" || process.env.AUTH_ENVIRONMENT==="production") throw new Error("Development migration only. Replit Publish manages production schema.");
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try { await pool.query(await fs.readFile(new URL("../migrations/0001_private.sql",import.meta.url),"utf8")); }
finally { await pool.end(); }
