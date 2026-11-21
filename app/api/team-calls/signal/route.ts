import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { chatError, getChatUser } from "../../../lib/team-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CALLS_ENABLED = process.env.SOLSTONE_CALLS_ENABLED === "true";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "no-store" };

async function authorizedCall(userId:string,id:string) {
  if (!UUID.test(id)) return null;
  const {data,error}=await supabaseAdmin.from("solstone_calls")
    .select("id,caller_id,callee_id,status,expires_at").eq("id",id).maybeSingle();
  if (error || !data ||
      (String(data.caller_id)!==userId && String(data.callee_id)!==userId)) return null;
  return data;
}

export async function GET(request:NextRequest) {
  if (!CALLS_ENABLED) return chatError("Pozivi nisu uključeni.",503);
  const user=await getChatUser();
  if (!user) return chatError("Prijava je istekla.",401);
  const callId=request.nextUrl.searchParams.get("callId") ?? "";
  const last=Number(request.nextUrl.searchParams.get("after") ?? "0");
  if (!Number.isSafeInteger(last) || last<0) return chatError("Neispravan pokazivač.");
  try {
    const call=await authorizedCall(user.id,callId);
    if (!call) return chatError("Nemaš pristup pozivu.",403);
    const {data,error}=await supabaseAdmin.from("solstone_call_signals")
      .select("id,kind,payload,created_at")
      .eq("call_id",callId).neq("sender_id",user.id).gt("id",last)
      .order("id",{ascending:true}).limit(80);
    if (error) throw error;
    return NextResponse.json({callStatus:call.status,signals:data??[]},
      {headers:noStore});
  } catch(error) {
    console.error("Read call signals failed:",error instanceof Error?error.message:"unknown");
    return chatError("Signali nisu dostupni.",503);
  }
}

export async function POST(request:NextRequest) {
  if (!CALLS_ENABLED) return chatError("Pozivi nisu uključeni.",503);
  if (request.headers.get("origin")!==request.nextUrl.origin) {
    return chatError("Neispravan zahtjev.",403);
  }
  const user=await getChatUser();
  if (!user) return chatError("Prijava je istekla.",401);
  try {
    const body=await request.json();
    const callId=String(body?.callId ?? "");
    const kind=String(body?.kind ?? "");
    const payload=body?.payload;
    const serialized=JSON.stringify(payload);
    if (!["offer","answer","candidate"].includes(kind) ||
        !payload || typeof payload!=="object" || Array.isArray(payload) ||
        !serialized || serialized.length>14000) {
      return chatError("Neispravan signal.");
    }
    const call=await authorizedCall(user.id,callId);
    if (!call) return chatError("Nemaš pristup pozivu.",403);
    const isCaller=String(call.caller_id)===user.id;
    const isCallee=String(call.callee_id)===user.id;
    if (!["ringing","accepted"].includes(call.status) ||
        (call.status==="ringing" && Date.parse(call.expires_at)<Date.now()) ||
        (kind==="offer" && !isCaller) ||
        (kind==="answer" && (!isCallee || call.status!=="accepted"))) {
      return chatError("Signal nije dozvoljen.",403);
    }
    if (kind==="offer" || kind==="answer") {
      if ((kind==="offer" && (payload.type!=="offer" || typeof payload.sdp!=="string")) ||
          (kind==="answer" && (payload.type!=="answer" || typeof payload.sdp!=="string")) ||
          String(payload.sdp).length>12000) {
        return chatError("Neispravan SDP.");
      }
    } else if (typeof payload.candidate!=="string" || payload.candidate.length>3500) {
      return chatError("Neispravan ICE kandidat.");
    }

    const {count,error:limitError}=await supabaseAdmin.from("solstone_call_signals")
      .select("id",{count:"exact",head:true}).eq("call_id",callId)
      .eq("sender_id",user.id);
    if (limitError) throw limitError;
    if ((count??0)>250) return chatError("Previše signala.",429);
    const {data,error}=await supabaseAdmin.from("solstone_call_signals")
      .insert({call_id:callId,sender_id:Number(user.id),kind,payload})
      .select("id").single();
    if (error?.code==="23505") return chatError("Signal već postoji.",409);
    if (error || !data) throw error ?? new Error("Cannot store signal");
    return NextResponse.json({id:data.id},{status:201,headers:noStore});
  } catch(error) {
    console.error("Write call signals failed:",error instanceof Error?error.message:"unknown");
    return chatError("Signal nije poslan.",503);
  }
}
