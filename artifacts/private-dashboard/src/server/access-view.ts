/**
 * What a friend's browser receives for a shared login. Pure functions, no database, so they are unit-tested.
 * The 2FA secret never leaves the server: only the current code, its period and the seconds left are sent.
 */
import { totpNow } from "./crypto";

export type Login = { email: string; username: string; password: string; totp: string; website: string };
export type TotpView = { code: string; period: number; remaining: number } | null;

export function totpView(login: Pick<Login, "totp">, now = Date.now()): TotpView {
  if (!login.totp) return null;
  const { code, period, remaining } = totpNow(login.totp, now);
  return { code, period, remaining }; // explicit copy: nothing else from the parsed secret can slip through
}

export function accessView(
  login: Login,
  link: { tool_name: string; logo_url: string | null; tool_url: string; expires_at: string | Date },
  views: number,
  now = Date.now(),
) {
  return {
    tool: { name: link.tool_name, logo_url: link.logo_url, url: login.website || link.tool_url },
    email: login.email, username: login.username, password: login.password,
    totp: totpView(login, now),
    expires_at: link.expires_at, views,
  };
}
