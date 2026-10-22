export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function authConfig() {
  const mode = process.env.AUTH_ENVIRONMENT;
  const raw = mode === "production" ? process.env.PRIVATE_APP_ORIGIN : mode === "preview" ? process.env.PREVIEW_AUTH_ORIGIN : undefined;
  if (!raw) throw new AccessError(503, "Privater Zugang noch nicht eingerichtet.");
  let url: URL;
  try { url = new URL(raw); } catch { throw new AccessError(503, "Ungültige Zugangskonfiguration."); }
  if (url.protocol !== "https:" || url.origin !== raw || url.username || url.password ||
      ["github.io", "replit.app"].includes(url.hostname) || (mode === "production" && url.hostname.endsWith(".replit.dev"))) {
    throw new AccessError(503, "Eine feste HTTPS-Origin muss eingerichtet werden.");
  }
  return { origin: url.origin, rpID: url.hostname };
}
export function safeExternalUrl(value: string) {
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password) throw new AccessError(400, "Nur HTTPS-Adressen ohne Zugangsdaten sind erlaubt.");
  return u.href;
}
export function checkOrigin(actual: string | null, expected: string) {
  if (actual !== expected) throw new AccessError(403, "Anfrage von dieser Origin nicht erlaubt.");
}
