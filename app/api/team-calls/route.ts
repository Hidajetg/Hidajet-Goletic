import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../lib/supabase-admin";
import { chatError, getChatUser } from "../../lib/team-chat";
import { notifyWorkerIncomingCall } from "../../lib/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CALLS_ENABLED = process.env.SOLSTONE_CALLS_ENABLED === "true";

const noStore = { "Cache-Control": "no-store" };
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sameOrigin(request: NextRequest) {
  return request.headers.get("origin") === request.nextUrl.origin;
}

async function expireStaleCalls() {
  const now=new Date();
  const staleCutoff=new Date(now.getTime()-90*1000).toISOString();
  const [missed,ended]=await Promise.all([
    supabaseAdmin.from("solstone_calls")
      .update({status:"missed",ended_at:now.toISOString()})
      .eq("status","ringing").lt("expires_at",now.toISOString()),
    supabaseAdmin.from("solstone_calls")
      .update({status:"ended",ended_at:now.toISOString()})
      .eq("status","accepted")
      .or("caller_seen_at.lt."+staleCutoff+",callee_seen_at.lt."+staleCutoff),
  ]);
  if(missed.error || ended.error) throw missed.error || ended.error;
}

export async function GET() {
  if (!CALLS_ENABLED) return chatError("Pozivi nisu uključeni.",503);
  const user = await getChatUser();
  if (!user) return chatError("Prijava je istekla.",401);
  try {
    // Keep only a live, authenticated participant's heartbeat fresh.
    await expireStaleCalls();
    const now=new Date().toISOString();
    const [callerBeat,calleeBeat]=await Promise.all([
      supabaseAdmin.from("solstone_calls")
        .update({caller_seen_at:now}).eq("status","accepted").eq("caller_id",user.id),
      supabaseAdmin.from("solstone_calls")
        .update({callee_seen_at:now}).eq("status","accepted").eq("callee_id",user.id),
    ]);
    if(callerBeat.error || calleeBeat.error) throw callerBeat.error || calleeBeat.error;
    const { data, error } = await supabaseAdmin.from("solstone_calls")
      .select("id,caller_id,callee_id,status,created_at,answered_at,ended_at,expires_at")
      .or("caller_id.eq."+user.id+",callee_id.eq."+user.id)
      .order("created_at",{ascending:false}).limit(20);
    if (error) throw error;
    const ids = [...new Set((data ?? []).flatMap((c) => [String(c.caller_id),String(c.callee_id)]))];
    const {data:workers,error:workersError} = ids.length
      ? await supabaseAdmin.from("workers").select("id,name").in("id",ids).limit(50)
      : {data:[],error:null};
    if (workersError) throw workersError;
    const names = new Map((workers??[]).map((w) => [String(w.id),String(w.name)]));
    const calls = (data??[]).map((c) => ({
      ...c, callerName:names.get(String(c.caller_id))??"Mitarbeiter",
      calleeName:names.get(String(c.callee_id))??"Mitarbeiter",
    }));
    const active = calls.filter((c) => c.status === "ringing" || c.status === "accepted");
    return NextResponse.json({
      userId:user.id, calls, active,
    },{headers:noStore});
  } catch (error) {
    console.error("List Solstone calls failed:",error instanceof Error?error.message:"unknown");
    return chatError("Pozivi još nisu dostupni.",503);
  }
}

export async function POST(request: NextRequest) {
  if (!CALLS_ENABLED) return chatError("Pozivi nisu uključeni.",503);
  if (!sameOrigin(request)) return chatError("Neispravan zahtjev.",403);
  const user = await getChatUser();
  if (!user) return chatError("Prijava je istekla.",401);
  try {
    const body = await request.json();
    const targetId = String(body?.targetWorkerId ?? "");
    if (!/^\d+$/.test(targetId) || targetId === user.id) return chatError("Odaberi drugog radnika.");
    const {data:target,error:targetError} = await supabaseAdmin.from("workers")
      .select("id,active").eq("id",targetId).maybeSingle();
    if (targetError || !target || target.active === false) return chatError("Radnik nije aktivan.",403);
    await expireStaleCalls();
    const {data:busy,error:busyError} = await supabaseAdmin.from("solstone_calls")
      .select("id,caller_id,callee_id,status,expires_at")
      .in("status",["ringing","accepted"])
      .or("caller_id.eq."+user.id+",callee_id.eq."+user.id+
          ",caller_id.eq."+targetId+",callee_id.eq."+targetId)
      .order("created_at",{ascending:false}).limit(40);
    if (busyError) throw busyError;
    if ((busy ?? []).some((c) => c.status === "accepted" ||
       Date.parse(c.expires_at) > Date.now())) return chatError("Jedan korisnik već ima poziv.",409);
    const {count,error:limitError}=await supabaseAdmin.from("solstone_calls")
      .select("id",{count:"exact",head:true}).eq("caller_id",user.id)
      .gte("created_at",new Date(Date.now()-5*60*1000).toISOString());
    if (limitError) throw limitError;
    if ((count??0) >= 8) return chatError("Previše poziva u kratkom periodu.",429);
    const {data:call,error}=await supabaseAdmin.from("solstone_calls")
      .insert({caller_id:Number(user.id),callee_id:Number(targetId)})
      .select("id,caller_id,callee_id,status,created_at,expires_at").single();
    if (error || !call) throw error ?? new Error("Cannot create call");
    await notifyWorkerIncomingCall(targetId);
    return NextResponse.json({call},{status:201,headers:noStore});
  } catch (error) {
    console.error("Start Solstone call failed:",error instanceof Error?error.message:"unknown");
    return chatError("Poziv nije uspostavljen.",503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!CALLS_ENABLED) return chatError("Pozivi nisu uključeni.",503);
  if (!sameOrigin(request)) return chatError("Neispravan zahtjev.",403);
  const user = await getChatUser();
  if (!user) return chatError("Prijava je istekla.",401);
  try {
    const body=await request.json();
    const callId=String(body?.callId ?? "");
    const action=String(body?.action ?? "");
    if (!ID_PATTERN.test(callId) || !["accept","decline","end"].includes(action)) {
      return chatError("Neispravan zahtjev.");
    }
    const {data:call,error:readError}=await supabaseAdmin.from("solstone_calls")
      .select("id,caller_id,callee_id,status,expires_at")
      .eq("id",callId).maybeSingle();
    if (readError || !call) return chatError("Poziv nije pronađen.",404);
    const isCaller=String(call.caller_id)===user.id;
    const isCallee=String(call.callee_id)===user.id;
    if (!isCaller && !isCallee) return chatError("Nemaš pristup pozivu.",403);
    const now = new Date().toISOString();
    if (action==="accept") {
      if (!isCallee || call.status!=="ringing" || Date.parse(call.expires_at)<Date.now()) {
        return chatError("Poziv više nije dostupan.",409);
      }
      const {data:updated,error}=await supabaseAdmin.from("solstone_calls")
        .update({status:"accepted",answered_at:now,caller_seen_at:now,callee_seen_at:now})
        .eq("id",callId).eq("status","ringing")
        .select("id,status").maybeSingle();
      if (error) throw error;
      if (!updated) return chatError("Poziv je već završen.",409);
      return NextResponse.json({call:updated},{headers:noStore});
    }
    if (action==="decline" && (!isCallee || call.status!=="ringing")) {
      return chatError("Poziv više nije dostupan.",409);
    }
    if (action==="end" && !["ringing","accepted"].includes(call.status)) {
      return NextResponse.json({success:true},{headers:noStore});
    }
    const {error}=await supabaseAdmin.from("solstone_calls")
      .update({status:action==="decline"?"declined":"ended",ended_at:now})
      .eq("id",callId).eq("status",call.status);
    if (error) throw error;
    return NextResponse.json({success:true},{headers:noStore});
  } catch(error) {
    console.error("Change Solstone call failed:",error instanceof Error?error.message:"unknown");
    return chatError("Poziv nije moguće promijeniti.",503);
  }
}
