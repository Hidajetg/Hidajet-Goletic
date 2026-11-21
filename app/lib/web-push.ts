import { createECDH, createPrivateKey, sign } from "node:crypto";
import { supabaseAdmin } from "./supabase-admin";
import { currentViennaDate, type ChatRoom } from "./team-chat";

// Payload-free Web Push: the service worker fetches the signed-cookie API
// for unread rooms, so no private message content is sent to push providers.
// This supports installed browser PWAs, NOT Android native WebView push.
export function webPushPublicKey(): string | null {
  const publicKey = process.env.SOLSTONE_VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.SOLSTONE_VAPID_PRIVATE_KEY ?? "";
  const contact = process.env.SOLSTONE_VAPID_CONTACT ?? "";
  try {
    const pub = Buffer.from(publicKey, "base64url");
    const priv = Buffer.from(privateKey, "base64url");
    const validContact = contact.startsWith("mailto:")
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.slice(7))
      : (() => {
          try {
            const url = new URL(contact);
            return url.protocol === "https:" && !!url.hostname &&
              !url.username && !url.password && !url.hash;
          } catch { return false; }
        })();
    if (pub.length !== 65 || pub[0] !== 4 || priv.length !== 32 || !validContact) {
      return null;
    }
    // Prevent a mismatched VAPID public/private key pair from silently
    // registering browsers for push messages the server can never deliver.
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(priv);
    if (!ecdh.getPublicKey(undefined, "uncompressed").equals(pub)) return null;
    return publicKey;
  } catch {
    return null;
  }
}

// Strict allow-list: subscription URLs are externally supplied and must
// never become arbitrary server-side requests (SSRF).
export function isTrustedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password ||
        url.hash || url.search || value.length > 2048) return false;
    const host = url.hostname.toLowerCase();
    return host === "fcm.googleapis.com" ||
      host === "updates.push.services.mozilla.com" ||
      host === "web.push.apple.com" ||
      host.endsWith(".push.apple.com") ||
      host === "wns.notify.windows.com" ||
      host.endsWith(".notify.windows.com");
  } catch {
    return false;
  }
}

function vapidAuthorization(endpoint: string): string {
  const publicKey = webPushPublicKey();
  if (!publicKey) throw new Error("Solstone push is not configured");
  const privateKey = Buffer.from(process.env.SOLSTONE_VAPID_PRIVATE_KEY!, "base64url");
  const pub = Buffer.from(publicKey, "base64url");
  const key = createPrivateKey({
    key: {
      kty: "EC", crv: "P-256",
      d: privateKey.toString("base64url"),
      x: pub.subarray(1, 33).toString("base64url"),
      y: pub.subarray(33, 65).toString("base64url"),
    },
    format: "jwk",
  });
  const aud = new URL(endpoint).origin;
  const header = Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({
    aud,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    sub: process.env.SOLSTONE_VAPID_CONTACT,
  })).toString("base64url");
  const signed = header + "." + claims;
  const signature = sign("sha256", Buffer.from(signed), {
    key, dsaEncoding: "ieee-p1363",
  }).toString("base64url");
  return "vapid t=" + signed + "." + signature + ", k=" + publicKey;
}

async function recipientIds(room: ChatRoom, senderId: string): Promise<string[]> {
  let ids: string[] = [];
  if (room.kind === "private") {
    const { data, error } = await supabaseAdmin
      .from("solstone_chat_members")
      .select("worker_id").eq("room_id", room.id);
    if (error) throw error;
    ids = (data ?? []).map((x) => String(x.worker_id));
  } else {
    const { data: workers, error: workersError } = await supabaseAdmin
      .from("workers").select("id,name").eq("active", true).limit(500);
    if (workersError) throw workersError;
    if (room.kind === "site") {
      // Today's calendar is the authoritative worker/site membership.
      const { data: calendar, error } = await supabaseAdmin
        .from("work_calendar").select("worker_name")
        .eq("datum", currentViennaDate()).eq("baustelle_id", room.site_id).limit(200);
      if (error) throw error;
      const names = new Set((calendar ?? []).map((row) => String(row.worker_name)));
      ids = (workers ?? []).filter((w) => names.has(String(w.name))).map((w) => String(w.id));
    } else {
      ids = (workers ?? []).map((w) => String(w.id));
    }
  }
  const unique = [...new Set(ids.filter((id) => /^\d+$/.test(id) && id !== senderId))];
  if (!unique.length) return [];
  // Recheck active status even for old private-room membership rows.
  const { data: active, error } = await supabaseAdmin.from("workers")
    .select("id").eq("active", true).in("id", unique).limit(500);
  if (error) throw error;
  return (active ?? []).map((w) => String(w.id));
}

async function sendEmptyWebPush(endpoint: string): Promise<number> {
  if (!isTrustedPushEndpoint(endpoint)) return 400;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: vapidAuthorization(endpoint),
      TTL: "120",
      Urgency: "normal",
    },
    redirect: "error",
    signal: AbortSignal.timeout(4500),
  });
  return res.status;
}

export async function notifyChatRecipients(room: ChatRoom, senderId: string): Promise<void> {
  if (!webPushPublicKey()) return;
  try {
    const ids = await recipientIds(room, senderId);
    if (!ids.length) return;
    const { data, error } = await supabaseAdmin
      .from("solstone_chat_push_subscriptions")
      .select("endpoint,worker_id")
      .in("worker_id", ids).limit(200);
    if (error) throw error;
    const subscriptions = (data ?? []).filter((s) => isTrustedPushEndpoint(String(s.endpoint)));
    for (let i = 0; i < subscriptions.length; i += 10) {
      await Promise.allSettled(subscriptions.slice(i, i + 10).map(async (subscription) => {
        const status = await sendEmptyWebPush(String(subscription.endpoint));
        if (status === 404 || status === 410) {
          await supabaseAdmin.from("solstone_chat_push_subscriptions")
            .delete().eq("endpoint", subscription.endpoint);
        }
      }));
    }
  } catch (error) {
    // Message delivery must not fail because push transport is unavailable.
    console.error("Solstone push dispatch failed:", error instanceof Error ? error.message : "unknown");
  }
}


/** Best-effort incoming-call signal for one verified active worker. */
export async function notifyWorkerIncomingCall(workerId: string): Promise<void> {
  if (!webPushPublicKey() || !/^\d+$/.test(workerId)) return;
  try {
    const {data:worker,error:workerError}=await supabaseAdmin.from("workers")
      .select("id").eq("id",workerId).eq("active",true).maybeSingle();
    if (workerError || !worker) return;
    const {data,error}=await supabaseAdmin
      .from("solstone_chat_push_subscriptions")
      .select("endpoint").eq("worker_id",workerId).limit(20);
    if (error) throw error;
    await Promise.allSettled((data??[])
      .filter((item)=>isTrustedPushEndpoint(String(item.endpoint)))
      .map(async (item)=>{
        const status=await sendEmptyWebPush(String(item.endpoint));
        if(status===404 || status===410){
          await supabaseAdmin.from("solstone_chat_push_subscriptions")
            .delete().eq("endpoint",item.endpoint);
        }
      }));
  } catch(error) {
    console.error("Solstone incoming-call push failed:",
      error instanceof Error?error.message:"unknown");
  }
}
