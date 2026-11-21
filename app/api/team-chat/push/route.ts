import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { chatError, getChatUser } from "../../../lib/team-chat";
import { isTrustedPushEndpoint, webPushPublicKey } from "../../../lib/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin === request.nextUrl.origin;
}

// Return ONLY the public VAPID key. Never send the private signing key.
export async function GET() {
  const user = await getChatUser();
  if (!user) return chatError("Prijava je istekla.", 401);
  const publicKey = webPushPublicKey();
  if (!publicKey) return chatError("Push još nije konfiguriran.", 503);
  return NextResponse.json({ publicKey }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return chatError("Neispravan zahtjev.", 403);
  const user = await getChatUser();
  if (!user) return chatError("Prijava je istekla.", 401);
  if (!webPushPublicKey()) return chatError("Push još nije konfiguriran.", 503);
  try {
    const body = await request.json();
    const endpoint = String(body?.subscription?.endpoint ?? "");
    if (!isTrustedPushEndpoint(endpoint)) {
      return chatError("Neispravna push pretplata.");
    }
    const { error } = await supabaseAdmin.from("solstone_chat_push_subscriptions")
      .upsert({
        endpoint,
        worker_id: Number(user.id),
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });
    if (error) throw error;
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Solstone push registration failed:", error instanceof Error ? error.message : "unknown");
    return chatError("Obavijesti još nisu dostupne.", 503);
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return chatError("Neispravan zahtjev.", 403);
  const user = await getChatUser();
  if (!user) return chatError("Prijava je istekla.", 401);
  try {
    const payload = await request.json();
    const endpoint = String(payload?.endpoint ?? "");
    if (!isTrustedPushEndpoint(endpoint)) return chatError("Neispravna pretplata.");
    const { error } = await supabaseAdmin.from("solstone_chat_push_subscriptions")
      .delete().eq("endpoint", endpoint).eq("worker_id", user.id);
    if (error) throw error;
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Solstone push unregister failed:", error instanceof Error ? error.message : "unknown");
    return chatError("Odjava obavijesti nije uspjela.", 503);
  }
}
