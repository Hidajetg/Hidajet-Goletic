import { NextResponse } from "next/server";
import { getVerifiedAppUser } from "../../../lib/verified-dashboard-admin";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

// The session, never a query parameter, selects the worker's own conversation.
// This endpoint intentionally provides no admin-wide listing.
export async function GET() {
  const user = await getVerifiedAppUser();
  if (!user) return NextResponse.json({ error: "Prijava je istekla." }, { status: 401, headers });

  try {
    const { data: threads, error: threadError } = await supabaseAdmin
      .from("ai_chat_conversations")
      .select("id")
      .eq("worker_id", user.id)
      .order("last_message_at", { ascending: false })
      .limit(1);
    if (threadError) throw threadError;
    if (!threads?.length) return NextResponse.json({ messages: [] }, { headers });

    const { data: messages, error: messageError } = await supabaseAdmin
      .from("ai_chat_messages")
      .select("id,role,content,created_at")
      .eq("conversation_id", threads[0].id)
      .order("created_at", { ascending: false })
      .limit(60);
    if (messageError) throw messageError;

    const safe = (messages ?? []).filter(m =>
      (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
    ).reverse().map(m => ({
      id: String(m.id),
      role: m.role,
      text: String(m.content).slice(0, 5500),
      at: m.created_at,
    }));
    return NextResponse.json({ messages: safe }, { headers });
  } catch (error) {
    console.error("Worker AI history lookup failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Historija trenutno nije dostupna." }, { status: 503, headers });
  }
}
