import { after, NextRequest, NextResponse } from "next/server";
import { notifyAuthorizedChatRoom } from "../../../lib/native-push-recipients";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { isSameOriginChatMutation, CHAT_BUCKET, canWriteChatRoom, chatError, getAuthorizedRoom, getChatUser } from "../../../lib/team-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UploadRow = {
  id: string; room_id: string; worker_id: number;
  object_path: string; original_name: string; kind: string;
  mime: string; size_bytes: number; expires_at: string; consumed_at: string | null;
};

async function listRoomMessages(roomId: string) {
  const { data: rows, error } = await supabaseAdmin
    .from("solstone_chat_messages")
    .select("id,room_id,sender_id,body,upload_id,created_at")
    .eq("room_id",roomId)
    .order("created_at",{ascending:false})
    .limit(80);
  if (error) throw error;
  const messages = (rows ?? []).reverse();
  const senderIds = Array.from(new Set(messages.map((message)=>String(message.sender_id))));
  const uploadIds = Array.from(new Set(messages.map((message)=>message.upload_id).filter(Boolean)));
  const [{data:workers,error:workerError},{data:uploads,error:uploadError}] = await Promise.all([
    senderIds.length ? supabaseAdmin.from("workers").select("id,name").in("id",senderIds) :
      Promise.resolve({data:[],error:null}),
    uploadIds.length ? supabaseAdmin.from("solstone_chat_pending_uploads")
      .select("id,original_name,mime,size_bytes,kind").in("id",uploadIds) :
      Promise.resolve({data:[],error:null}),
  ]);
  if (workerError || uploadError) throw workerError || uploadError;
  const names = new Map((workers ?? []).map((w)=>[String(w.id),String(w.name)]));
  const attachments = new Map((uploads ?? []).map((a)=>[String(a.id),a]));
  return messages.map((message)=>({
    id:message.id, roomId:message.room_id,
    senderId:String(message.sender_id), senderName:names.get(String(message.sender_id)) ?? "Mitarbeiter",
    body:message.body ?? "",createdAt:message.created_at,
    attachment:message.upload_id ? attachments.get(String(message.upload_id)) ?? null : null,
  }));
}

export async function GET(request: NextRequest) {
  const user = await getChatUser();
  if (!user) return chatError("Prijava je istekla.",401);
  try {
    const roomId = request.nextUrl.searchParams.get("roomId") ?? "";
    const room = await getAuthorizedRoom(user,roomId);
    if (!room) return chatError("Nemaš pristup ovom razgovoru.",403);
    return NextResponse.json({
      room:{id:room.id,kind:room.kind,canWrite:canWriteChatRoom(user,room)},
      messages:await listRoomMessages(room.id),
    },{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    console.error("Team chat messages GET failed:",error);
    return chatError("Poruke nije moguće učitati.",503);
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginChatMutation(request)) return chatError("Neispravan zahtjev.", 403);
  const user = await getChatUser();
  if (!user) return chatError("Prijava je istekla.",401);
  try {
    const body = await request.json();
    const roomId = String(body.roomId ?? "");
    const text = String(body.text ?? "").trim();
    const uploadId = body.uploadId ? String(body.uploadId) : null;
    const room = await getAuthorizedRoom(user,roomId);
    if (!room || !canWriteChatRoom(user,room)) return chatError("Nemaš dozvolu za slanje.",403);
    if (text.length > 4000 || (!text && !uploadId)) return chatError("Poruka je prazna ili preduga.");

    // Basic flood protection; a future shared Redis limiter is recommended
    // before exposing chat to a larger organization.
    const {data:recent,error:recentError} = await supabaseAdmin
      .from("solstone_chat_messages")
      .select("id").eq("sender_id",user.id)
      .gte("created_at",new Date(Date.now()-700).toISOString()).limit(1);
    if (recentError) throw recentError;
    if (recent?.length) return chatError("Sačekaj prije sljedeće poruke.",429);
    const {count:volume,error:volumeError}=await supabaseAdmin
      .from("solstone_chat_messages")
      .select("id",{count:"exact",head:true}).eq("sender_id",user.id)
      .gte("created_at",new Date(Date.now()-5*60*1000).toISOString());
    if (volumeError) throw volumeError;
    if ((volume ?? 0)>=100) return chatError("Previše poruka u kratkom periodu.",429);

    let upload: UploadRow | null = null;
    if (uploadId) {
      if (!/^[0-9a-f-]{36}$/i.test(uploadId)) return chatError("Neispravan prilog.");
      const {data,error} = await supabaseAdmin.from("solstone_chat_pending_uploads")
        .select("*").eq("id",uploadId).maybeSingle();
      if (error || !data) return chatError("Prilog nije pronađen.",404);
      upload = data as UploadRow;
      if (String(upload.worker_id)!==user.id || upload.room_id!==roomId ||
          upload.consumed_at || new Date(upload.expires_at).getTime()<Date.now()) {
        return chatError("Prilog je istekao ili nije tvoj.",403);
      }

      // A signed upload URL is not proof that the file was uploaded.
      const {data:info,error:infoError} =
        await supabaseAdmin.storage.from(CHAT_BUCKET).info(upload.object_path);
      if (infoError || !info) return chatError("Datoteka još nije učitana.",409);
      if (!info.size || info.size > upload.size_bytes || info.size > 20*1024*1024) {
        return chatError("Veličina datoteke nije ispravna.",409);
      }
      if (info.contentType && info.contentType.split(";")[0] !== upload.mime) {
        return chatError("Vrsta datoteke ne odgovara.",409);
      }
    }

    const {data:message,error:messageError}=await supabaseAdmin
      .from("solstone_chat_messages")
      .insert({room_id:roomId,sender_id:Number(user.id),body:text,upload_id:uploadId})
      .select("id").single();
    if (messageError) {
      if (messageError.code==="23505") return chatError("Prilog je već poslan.",409);
      throw messageError;
    }
    if (upload) {
      const {error:markError} = await supabaseAdmin.from("solstone_chat_pending_uploads")
        .update({consumed_at:new Date().toISOString()}).eq("id",upload.id).is("consumed_at",null);
      if (markError) console.error("Chat upload cleanup flag failed:",markError);
    }
    after(()=>notifyAuthorizedChatRoom(room,user.id));
    return NextResponse.json({id:message.id,success:true},{status:201,headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    console.error("Team chat POST failed:",error);
    return chatError("Poruka nije poslana.",503);
  }
}
