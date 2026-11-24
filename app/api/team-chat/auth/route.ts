import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { createSessionToken, verifySessionToken } from "../../../lib/admin-session";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { isSameOriginChatMutation, chatError } from "../../../lib/team-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * Compatibility endpoint for older cached clients. Current clients receive
 * their scoped chat cookie automatically at the main bcrypt login.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginChatMutation(request)) return chatError("Neispravan zahtjev.", 403);
  const cookieStore = await cookies();
  const ordinary = verifySessionToken(cookieStore.get("solstone_session")?.value);
  if (!ordinary || !/^\d+$/.test(String(ordinary.id))) {
    return chatError("Prijavi se u Solstone aplikaciju.", 401);
  }
  try {
    const body = await request.json();
    const pin = String(body?.pin ?? "").trim();
    if (!/^\d{4,8}$/.test(pin)) return chatError("Unesi svoj PIN od 4 do 8 cifara.");

    const { data: worker, error: workerError } = await supabaseAdmin.from("workers")
      .select("id,name,role,active")
      .eq("id", ordinary.id).maybeSingle();
    if (workerError || !worker || worker.active !== true) {
      return chatError("Račun nije aktivan.",403);
    }

    const { data: attempts, error: guardError } = await supabaseAdmin
      .from("solstone_chat_auth_attempts")
      .select("attempts,window_start").eq("worker_id",ordinary.id).maybeSingle();
    if (guardError) throw guardError;
    const now = Date.now();
    const inWindow = !!attempts && now - Date.parse(attempts.window_start) < WINDOW_MS;
    if (inWindow && attempts.attempts >= MAX_ATTEMPTS) {
      return chatError("Previše pokušaja. Pokušaj ponovo za 15 minuta.",429);
    }

    const { data: credential, error: pinError } = await supabaseAdmin
      .from("worker_auth").select("pin_hash")
      .eq("worker_id",String(worker.id)).maybeSingle();
    if (pinError) throw pinError;
    if (!credential?.pin_hash) {
      return chatError("Za ovaj račun treba postaviti sigurni PIN preko administratora.",403);
    }

    const valid = await bcrypt.compare(pin,String(credential.pin_hash));
    if (!valid) {
      const next = inWindow ? Math.min(100, attempts.attempts + 1) : 1;
      const { error: saveError } = await supabaseAdmin
        .from("solstone_chat_auth_attempts")
        .upsert({
          worker_id:Number(worker.id),
          attempts:next,
          window_start:inWindow ? attempts.window_start : new Date(now).toISOString(),
        },{onConflict:"worker_id"});
      if (saveError) throw saveError;
      return chatError("PIN nije ispravan.",401);
    }

    // A failed audit cleanup must not silently break a successful login.
    const { error: clearError } = await supabaseAdmin
      .from("solstone_chat_auth_attempts").delete().eq("worker_id",worker.id);
    if (clearError) throw clearError;

    const token = createSessionToken({
      id:String(worker.id),
      name:String(worker.name),
      role:String(worker.role).toLowerCase()==="admin" ? "admin" : "worker",
      purpose:"chat",
    },7);
    const response = NextResponse.json({ success:true }, {
      headers:{"Cache-Control":"no-store"},
    });
    response.cookies.set({
      name:"solstone_chat_auth",
      value:token,
      httpOnly:true,
      secure:process.env.NODE_ENV==="production",
      sameSite:"lax",
      path:"/",
      maxAge:7*24*60*60,
    });
    return response;
  } catch (error) {
    console.error("Chat PIN verification unavailable",error instanceof Error?error.message:"unknown");
    return chatError("Provjera PIN-a trenutno nije dostupna.",503);
  }
}
