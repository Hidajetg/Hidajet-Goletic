import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { chatError,getAuthorizedRoom,getChatUser } from "../../../lib/team-chat";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request: NextRequest) {
  const user=await getChatUser();
  if (!user) return chatError("Prijava je istekla.",401);
  try {
    const payload=await request.json();
    const roomId=String(payload.roomId ?? "");
    if (!(await getAuthorizedRoom(user,roomId))) return chatError("Nemaš pristup razgovoru.",403);
    const {error}=await supabaseAdmin.from("solstone_chat_reads")
      .upsert({room_id:roomId,worker_id:Number(user.id),last_read_at:new Date().toISOString()},
        {onConflict:"room_id,worker_id"});
    if (error) throw error;
    return NextResponse.json({success:true},{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    console.error("Mark chat messages read failed:",error);
    return chatError("Nije moguće označiti poruke pročitanim.",503);
  }
}
