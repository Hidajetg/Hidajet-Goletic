import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "../../../lib/admin-session";
import { getChatUser, chatError, isSameOriginChatMutation } from "../../../lib/team-chat";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { nativePushConfigured, deviceBinding, sessionHash } from "../../../lib/native-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = {"Cache-Control":"no-store"};
async function identity() {
  const raw=(await cookies()).get("solstone_session")?.value;
  const session=verifySessionToken(raw);
  const chat=verifySessionToken((await cookies()).get("solstone_chat_auth")?.value, "chat");
  const user=await getChatUser();
  return raw && session && chat && user && String(session.id)===user.id && String(chat.id)===user.id ? {raw,session:{...session,exp:Math.min(session.exp,chat.exp)},user} : null;
}
export async function GET() {
  if (!await identity()) return chatError("Prijava je istekla.",401);
  return NextResponse.json({configured:nativePushConfigured()},{headers:noStore});
}
export async function POST(request:NextRequest) {
  if(!isSameOriginChatMutation(request)) return chatError("Neispravan zahtjev.",403);
  const auth=await identity();
  if(!auth) return chatError("Prijava je istekla.",401);
  if(!nativePushConfigured()) return chatError("Android push nije konfiguriran.",503);
  try {
    const body=await request.json();
    const token=typeof body.token==="string"?body.token:"";
    if(!/^[A-Za-z0-9_:\-]{32,4096}$/.test(token)) return chatError("Neispravan token.");
    const binding=deviceBinding(auth.raw,token);
    const {error}=await supabaseAdmin.from("solstone_native_push_devices").upsert({
      token,worker_id:Number(auth.user.id),session_hash:sessionHash(auth.raw),binding,
      expires_at:new Date(auth.session.exp).toISOString(),updated_at:new Date().toISOString(),
    },{onConflict:"token"});
    if(error) throw error;
    return NextResponse.json({binding,expiresAt:auth.session.exp},{headers:noStore});
  } catch { return chatError("Registracija obavijesti nije uspjela.",503); }
}
export async function DELETE(request:NextRequest) {
  if(!isSameOriginChatMutation(request)) return chatError("Neispravan zahtjev.",403);
  const auth=await identity();
  if(!auth) return chatError("Prijava je istekla.",401);
  try {
    const {token}=await request.json();
    if(typeof token!=="string" || !/^[A-Za-z0-9_:\-]{32,4096}$/.test(token)) return chatError("Neispravan token.");
    const {error}=await supabaseAdmin.from("solstone_native_push_devices").delete()
      .eq("token",token).eq("worker_id",auth.user.id).eq("session_hash",sessionHash(auth.raw));
    if(error) throw error;
    return NextResponse.json({success:true},{headers:noStore});
  } catch { return chatError("Odjava obavijesti nije uspjela.",503); }
}
