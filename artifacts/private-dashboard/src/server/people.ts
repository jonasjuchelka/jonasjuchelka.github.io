import "server-only";
import type { PoolClient } from "pg";

/**
 * Permanent deletion, used by the admin and by people deleting their own account.
 * Everything personal goes (passkeys, sessions, groups, grants, links, e-mail); only the name stays
 * so the admin list can show "Endgültig gelöscht". Must run inside a transaction with the user row locked.
 */
export async function tombstoneUser(c: PoolClient, userId: string) {
  for (const table of ["sessions", "passkeys", "memberships", "grants", "access_links", "challenges"])
    await c.query(`DELETE FROM private_area.${table} WHERE user_id=$1`, [userId]);
  await c.query("UPDATE private_area.invitations SET email=NULL WHERE user_id=$1", [userId]);
  await c.query("UPDATE private_area.users SET blocked=true,deleted_at=now(),email=NULL WHERE id=$1 AND deleted_at IS NULL", [userId]);
}
