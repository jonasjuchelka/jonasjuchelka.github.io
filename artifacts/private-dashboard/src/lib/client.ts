"use client";
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  WebAuthnError,
} from "@simplewebauthn/browser";

export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method: init?.method ?? "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Der Server ist gerade nicht erreichbar. Bitte prüfe deine Verbindung und versuche es erneut.");
  }
  let data: unknown = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const msg = (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string")
      ? (data as { error: string }).error
      : defaultMessage(res.status);
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

function defaultMessage(status: number) {
  switch (status) {
    case 401: return "Du bist nicht angemeldet oder deine Bestätigung ist abgelaufen.";
    case 403: return "Dafür fehlt dir die Berechtigung.";
    case 409: return "Die Aktion steht im Konflikt mit dem aktuellen Zustand.";
    case 429: return "Zu viele Versuche. Bitte warte einen Moment.";
    case 503: return "Der Dienst ist noch nicht eingerichtet oder vorübergehend nicht verfügbar.";
    default: return "Vorübergehender Serverfehler. Bitte später erneut versuchen.";
  }
}

export function passkeyError(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  const name = e instanceof WebAuthnError ? (e.cause as Error | undefined)?.name ?? e.name : (e as Error)?.name;
  const code = e instanceof WebAuthnError ? e.code : "";
  if (code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" || name === "InvalidStateError")
    return "Dieser Authenticator ist für dieses Konto bereits registriert. Verwende ein anderes Gerät oder einen anderen Sicherheitsschlüssel.";
  if (name === "NotAllowedError" || name === "AbortError")
    return "Der Passkey-Vorgang wurde abgebrochen oder ist abgelaufen. Du kannst es erneut versuchen oder ein anderes Gerät mit deinem Passkey wählen.";
  if (name === "SecurityError")
    return "Diese Adresse ist für Passkeys nicht zugelassen. Öffne den privaten Bereich über seine eingerichtete HTTPS-Adresse.";
  if (name === "NotSupportedError")
    return "Dein Gerät unterstützt die angeforderte Passkey-Art nicht. Versuche ein anderes Gerät oder einen Sicherheitsschlüssel.";
  return "Der Passkey-Vorgang ist fehlgeschlagen. Bitte versuche es erneut.";
}

export function webauthnSupported() {
  return typeof window !== "undefined" && browserSupportsWebAuthn();
}

const UNSUPPORTED = "Dieser Browser unterstützt keine Passkeys. Verwende einen aktuellen Browser oder ein anderes Gerät. Es gibt keinen Passwort-Ersatz.";

export async function authenticate(purpose: "login" | "reauth") {
  if (!webauthnSupported()) throw new Error(UNSUPPORTED);
  const optionsJSON = await api<Parameters<typeof startAuthentication>[0]["optionsJSON"]>("/auth/options", { method: "POST", body: { purpose } });
  const response = await startAuthentication({ optionsJSON });
  await api("/auth/verify", { method: "POST", body: { response } });
}

export async function register(optionsPath: string, optionsBody: unknown, verifyPath: string, name: string) {
  if (!webauthnSupported()) throw new Error(UNSUPPORTED);
  const optionsJSON = await api<Parameters<typeof startRegistration>[0]["optionsJSON"]>(optionsPath, { method: "POST", body: optionsBody });
  const response = await startRegistration({ optionsJSON });
  await api(verifyPath, { method: "POST", body: { response, name } });
}

export function errText(e: unknown) {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message.startsWith("Dieser Browser")) return e.message;
  return passkeyError(e);
}

export function fmt(d: string | null | undefined) {
  if (!d) return "–";
  const x = new Date(d);
  return isNaN(x.getTime()) ? d : x.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

export type Tool = { id: string; name: string; provider: string; description: string; url: string; access_type: AccessType; instructions: string; plan?: string; price?: string; details?: string; logo_url?: string };
export type AccessType = "own_account" | "team_seat" | "permitted_shared";
export const ACCESS_LABEL: Record<AccessType, string> = {
  own_account: "Eigenes Konto",
  team_seat: "Offizieller Teamplatz",
  permitted_shared: "Ausdrücklich erlaubter geteilter Zugang",
};
export const ACCESS_HINT: Record<AccessType, string> = {
  own_account: "Du meldest dich mit deinem eigenen Konto beim Anbieter an.",
  team_seat: "Du bekommst einen Platz im Team-Abo des Anbieters und meldest dich mit eigenem Login an.",
  permitted_shared: "Ein gemeinsamer Login. Die Zugangsdaten stehen im Passworttresor.",
};
export type Account = { user: { id: string; name: string; role: string }; passkeys: { id: string; name: string; created_at: string }[]; sessions: { id: string; created_at: string; expires_at: string; current: boolean }[] };
export type AdminData = {
  users: { id: string; name: string; role: string; blocked: boolean }[];
  groups: { id: string; name: string }[];
  memberships: { user_id: string; group_id: string }[];
  tools: Tool[];
  grants: { id: string; tool_id: string; user_id: string | null; group_id: string | null }[];
  invitations: { id: string; name: string; expires_at: string; used_at: string | null }[];
};
