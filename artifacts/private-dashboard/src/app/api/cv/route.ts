import { NextRequest, NextResponse } from "next/server";
import { AccessError, authConfig, checkOrigin } from "../../../server/policy";
import { rateLimit, digest } from "../../../server/auth";
import { getCvFile, saveCvFile } from "../../../server/cv";

// Lebenslauf (Stationen) lesen und speichern. Nur Administratoren; Speichern braucht eine frische Passkey-Bestätigung.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" };

async function handle(request: NextRequest) {
  try {
    const config = authConfig();
    if (request.method !== "GET") checkOrigin(request.headers.get("origin"), config.origin);
    const ip = process.env.VERCEL === "1" ? (request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "") : "";
    if (ip) await rateLimit(`cv:${digest(`rl:${ip}`).slice(0, 24)}`, 30);
    if (request.method === "GET") return NextResponse.json(await getCvFile(), { headers });
    if (request.method === "PUT") {
      if (Number(request.headers.get("content-length") ?? 0) > 200_000) throw new AccessError(413, "Zu groß.");
      return NextResponse.json(await saveCvFile(await request.json().catch(() => null)), { headers });
    }
    return NextResponse.json({ error: "Methode nicht erlaubt." }, { status: 405, headers });
  } catch (e) {
    if (e instanceof AccessError) return NextResponse.json({ error: e.message }, { status: e.status, headers });
    console.error("cv route failed", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Vorübergehender Serverfehler." }, { status: 500, headers });
  }
}
export { handle as GET, handle as PUT };
