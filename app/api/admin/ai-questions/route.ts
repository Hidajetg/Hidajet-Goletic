import { NextRequest, NextResponse } from "next/server";
import { getChatUser } from "../../../lib/team-chat";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const user = await getChatUser();
  if (!user) return NextResponse.json({ error: "Prijava je istekla." }, { status: 401, headers: noStore });
  if (!user.isAdmin) return NextResponse.json({ error: "Samo administrator." }, { status: 403, headers: noStore });
  const id = request.nextUrl.searchParams.get("conversation");
  try {
    if (id !== null) {
      if (!/^[a-f0-9-]{36}$/i.test(id)) return NextResponse.json({ error: "Neispravan ID." }, { status: 400, headers: noStore });
      const { data: conversations, error: ce } = await supabaseAdmin
        .from("ai_chat_conversations")
        .select("id,worker_name,worker_role,language,last_question,last_message_at")
        .eq("id", id).limit(1);
      if (ce) throw ce;
      const conversation = conversations?.[0];
      if (!conversation) return NextResponse.json({ error: "Razgovor nije pronađen." }, { status: 404, headers: noStore });
      const { data: messages, error: me } = await supabaseAdmin
        .from("ai_chat_messages")
        .select("id,role,content,created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true }).limit(120);
      if (me) throw me;
      return NextResponse.json({ conversation, messages: messages ?? [] }, { headers: noStore });
    }
    const { data: conversations, error } = await supabaseAdmin
      .from("ai_chat_conversations")
      .select("id,worker_name,worker_role,language,last_question,last_message_at")
      .order("last_message_at", { ascending: false }).limit(120);
    if (error) throw error;
    return NextResponse.json({ conversations: conversations ?? [] }, { headers: noStore });
  } catch (error) {
    console.error("Admin AI questions load failed", error);
    return NextResponse.json({ error: "AI pitanja se trenutno ne mogu učitati." }, { status: 503, headers: noStore });
  }
}
