import { NextRequest, NextResponse } from "next/server";
import { AccessError, authConfig, checkOrigin } from "../../../server/policy";
import { rateLimit, digest } from "../../../server/auth";
import { UploadError, MAX_UPLOAD_BYTES } from "../../../server/publish-core";
import { listPublished, publishUpload, unpublish } from "../../../server/publish";

// Eigene Route (nicht die JSON-Sammelroute), weil hier Dateien als multipart ankommen.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" };

async function guard(request: NextRequest) {
  const config = authConfig();
  if (request.method !== "GET") checkOrigin(request.headers.get("origin"), config.origin);
  const ip = process.env.VERCEL === "1" ? (request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "") : "";
  if (ip) await rateLimit(`publish:${digest(`rl:${ip}`).slice(0, 24)}`, 20);
  await rateLimit("publish:all", 120);
}
async function handle(request: NextRequest) {
  try {
    await guard(request);
    if (request.method === "GET") return NextResponse.json({ items: await listPublished() }, { headers });
    if (request.method === "POST") {
      if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 16_384) throw new UploadError(413, "Die Datei ist größer als 4 MB.");
      if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw new UploadError(415, "Formular-Upload erwartet.");
      return NextResponse.json(await publishUpload(await request.formData()), { headers });
    }
    if (request.method === "DELETE") {
      const body = (await request.json().catch(() => ({}))) as { slug?: unknown };
      return NextResponse.json(await unpublish(String(body.slug ?? "")), { headers });
    }
    return NextResponse.json({ error: "Methode nicht erlaubt." }, { status: 405, headers });
  } catch (e) {
    if (e instanceof AccessError || e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: e.status, headers });
    console.error("publish route failed", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Vorübergehender Serverfehler." }, { status: 500, headers });
  }
}
export { handle as GET, handle as POST, handle as DELETE };
