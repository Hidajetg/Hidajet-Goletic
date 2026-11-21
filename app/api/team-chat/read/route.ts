import { isSameOriginChatMutation, NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { chatError,getAuthorizedRoom,getChatUser } from "../../../lib/team-chat";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOriginChatMutation(request)) return chatError("Neispravan zahtjev.", 403);
  const user=await getChatUser();
  if (!user) return chatError("Prijava je istekla.",401);
  try {
    const payload=await request.json();
    const roomId=String(payload.roomId ?? "");
    if (!(await getAuthorizedRoom(user,roomId))) return chatError("Nemaš pristup razgovoru.",403);
    const throughId=String(payload.throughId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(throughId)) return chatError("Neispravna poruka.");
    // Client acknowledges ONLY the last message it actually loaded. A newer
    // message sent after that fetch must stay unread until it is displayed.
    const {data:through,error:throughError}=await supabaseAdmin
      .from("solstone_chat_messages")
      .select("created_at").eq("id",throughId).eq("room_id",roomId).maybeSingle();
    if (throughError || !through) return chatError("Poruka nije pronađena.",404);
    const {error}=await supabaseAdmin.from("solstone_chat_reads")
      .upsert({room_id:roomId,worker_id:Number(user.id),last_read_at:through.created_at},
        {onConflict:"room_id,worker_id"});
    if (error) throw error;
    return NextResponse.json({success:true},{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    console.error("Mark chat messages read failed:",error);
    return chatError("Nije moguće označiti poruke pročitanim.",503);
  }
}
