import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import {
  CHAT_BUCKET,CHAT_FILE_TYPES,CHAT_MAX_FILE_BYTES,canWriteChatRoom,
  chatError,getAuthorizedRoom,getChatUser,
} from "../../../lib/team-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getChatUser();
  if (!user) return chatError("Prijava je istekla.",401);
  try {
    const payload=await request.json();
    const roomId=String(payload.roomId ?? "");
    const mime=String(payload.mime ?? "").split(";")[0].toLowerCase().trim();
    const name=String(payload.name ?? "").trim().slice(0,180);
    const size=Number(payload.size);
    const type=CHAT_FILE_TYPES[mime];
    if (!type || !name || !Number.isSafeInteger(size) || size<=0 || size>CHAT_MAX_FILE_BYTES) {
      return chatError("Dozvoljene su slike, PDF i audio snimke do 20 MB.");
    }
    const room=await getAuthorizedRoom(user,roomId);
    if (!room || !canWriteChatRoom(user,room)) return chatError("Nemaš pristup razgovoru.",403);

    const objectPath=roomId+"/"+randomUUID()+"."+type.ext;
    const {data:pending,error:pendingError}=await supabaseAdmin
      .from("solstone_chat_pending_uploads")
      .insert({
        room_id:roomId,worker_id:Number(user.id),object_path:objectPath,
        original_name:name,mime,size_bytes:size,kind:type.kind,
      })
      .select("id").single();
    if (pendingError || !pending) throw pendingError ?? new Error("Cannot create upload");

    const {data:sign,error:signError}=await supabaseAdmin.storage
      .from(CHAT_BUCKET).createSignedUploadUrl(objectPath);
    if (signError || !sign) {
      await supabaseAdmin.from("solstone_chat_pending_uploads").delete().eq("id",pending.id);
      throw signError ?? new Error("Cannot create signed upload URL");
    }

    // This path is random, scoped to one conversation and cannot read anything.
    // Signed uploads expire in Supabase after 2h; server accepts the attachment
    // as a message only within the pending-upload's 10min window.
    return NextResponse.json({
      uploadId:pending.id,path:objectPath,token:sign.token,kind:type.kind,
    },{headers:{"Cache-Control":"no-store"}});
  }catch(error) {
    console.error("Team chat media upload preparation failed:",error);
    return chatError("Prilog nije moguće pripremiti.",503);
  }
}

export async function GET(request: NextRequest) {
  const user=await getChatUser();
  if (!user) return chatError("Prijava je istekla.",401);
  try {
    const messageId=request.nextUrl.searchParams.get("messageId") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(messageId)) return chatError("Nepoznata poruka.");
    const {data:message,error:messageError}=await supabaseAdmin
      .from("solstone_chat_messages")
      .select("id,room_id,upload_id").eq("id",messageId).maybeSingle();
    if (messageError || !message || !message.upload_id) return chatError("Prilog nije pronađen.",404);
    if (!(await getAuthorizedRoom(user,message.room_id))) return chatError("Nemaš pristup prilogu.",403);
    const {data:upload,error:uploadError}=await supabaseAdmin
      .from("solstone_chat_pending_uploads")
      .select("object_path,original_name,mime,kind")
      .eq("id",message.upload_id).maybeSingle();
    if (uploadError || !upload) return chatError("Prilog nije pronađen.",404);
    const {data:signed,error}=await supabaseAdmin.storage
      .from(CHAT_BUCKET).createSignedUrl(upload.object_path,60);
    if (error || !signed) throw error ?? new Error("Cannot sign attachment");
    return NextResponse.json({
      url:signed.signedUrl,name:upload.original_name,kind:upload.kind,mime:upload.mime,
    },{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    console.error("Team chat media read failed:",error);
    return chatError("Prilog nije dostupan.",503);
  }
}
