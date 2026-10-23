import {test} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import pg from "pg";

test("private database: one-time invitation, expiry, revocation and scoped grants",async()=>{
  if(process.env.AUTH_ENVIRONMENT==="production") throw new Error("Development-only test.");
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
  const c=await pool.connect();
  try {
    await c.query("BEGIN");
    const a=randomUUID(),b=randomUUID(),inv=randomUUID(),expired=randomUUID(),tool=randomUUID(),session=randomUUID();
    await c.query("INSERT INTO private_area.users(id,name,role) VALUES($1,'Test A','member'),($2,'Test B','member')",[a,b]);
    await c.query("INSERT INTO private_area.invitations(id,token_hash,name,expires_at) VALUES($1,$2,'Test',now()+interval '1 minute'),($3,$4,'Expired',now()-interval '1 minute')",[inv,randomUUID(),expired,randomUUID()]);
    const consume="UPDATE private_area.invitations SET used_at=now() WHERE id=$1 AND used_at IS NULL AND expires_at>now() RETURNING id";
    assert.equal((await c.query(consume,[inv])).rowCount,1);
    assert.equal((await c.query(consume,[inv])).rowCount,0,"replay rejected");
    assert.equal((await c.query(consume,[expired])).rowCount,0,"expired invite rejected");
    const hash=randomUUID();
    await c.query("INSERT INTO private_area.challenges(token_hash,challenge,purpose,expires_at) VALUES($1,'test','login',now()+interval '1 minute')",[hash]);
    const burn="DELETE FROM private_area.challenges WHERE token_hash=$1 AND expires_at>now() RETURNING challenge";
    assert.equal((await c.query(burn,[hash])).rowCount,1);
    assert.equal((await c.query(burn,[hash])).rowCount,0,"challenge replay rejected");
    await c.query("INSERT INTO private_area.sessions(id,token_hash,user_id,expires_at) VALUES($1,$2,$3,now()+interval '1 hour')",[session,randomUUID(),a]);
    assert.equal((await c.query("DELETE FROM private_area.sessions WHERE id=$1 AND user_id=$2 RETURNING id",[session,b])).rowCount,0,"foreign session not deleted");
    await c.query("UPDATE private_area.users SET blocked=true WHERE id=$1",[a]);
    assert.equal((await c.query("SELECT s.id FROM private_area.sessions s JOIN private_area.users u ON s.user_id=u.id WHERE s.id=$1 AND NOT u.blocked AND s.expires_at>now()",[session])).rowCount,0,"blocked user not authorized");
    await c.query("INSERT INTO private_area.tools(id,name,provider,description,url,access_type,instructions) VALUES($1,'Test','Test','','https://example.com','own_account','')",[tool]);
    await c.query("INSERT INTO private_area.grants(id,tool_id,user_id) VALUES($1,$2,$3)",[randomUUID(),tool,a]);
    const visible="SELECT t.id FROM private_area.tools t JOIN private_area.grants g ON g.tool_id=t.id WHERE g.user_id=$1 OR g.group_id IN (SELECT group_id FROM private_area.memberships WHERE user_id=$1)";
    assert.equal((await c.query(visible,[a])).rowCount,1);
    assert.equal((await c.query(visible,[b])).rowCount,0,"other user sees no tool");
  } finally {
    await c.query("ROLLBACK"); c.release(); await pool.end();
  }
});
