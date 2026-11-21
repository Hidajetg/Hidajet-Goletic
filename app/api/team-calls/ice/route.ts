import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { chatError, getChatUser } from "../../../lib/team-chat";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const noStore={ "Cache-Control": "no-store" };

/**
 * Authenticated ICE configuration for browser WebRTC.
 *
 * With no TURN configuration, the demo uses public STUN only (some networks
 * will not connect). When a coturn server is explicitly configured, issue
 * short-lived HMAC credentials. Never expose the shared server-side secret.
 *
 * Requires a coturn instance configured with use-auth-secret, static-auth-secret
 * and realm, plus its own bandwidth/abuse monitoring.
 */
export async function GET() {
  if (process.env.SOLSTONE_CALLS_ENABLED !== "true") {
    return chatError("Pozivi nisu uključeni.",503);
  }
  const user=await getChatUser();
  if (!user) return chatError("Prijava je istekla.",401);
  const iceServers:{urls:string|string[];username?:string;credential?:string}[]=[
    {urls:"stun:stun.l.google.com:19302"},
  ];
  const urls=(process.env.SOLSTONE_TURN_URLS??"").split(",").map(s=>s.trim())
    .filter(s=>/^turns?:[a-z0-9.-]+(?::[0-9]{2,5})?(?:\?transport=(udp|tcp))?$/i.test(s))
    .slice(0,4);
  const secret=process.env.SOLSTONE_TURN_SHARED_SECRET??"";
  if(urls.length && secret.length>=20) {
    const expires=Math.floor(Date.now()/1000)+60*60;
    const username=expires+":"+user.id;
    const credential=createHmac("sha1",secret).update(username).digest("base64");
    iceServers.push({urls,username,credential});
  }
  return NextResponse.json({iceServers},{headers:noStore});
}
