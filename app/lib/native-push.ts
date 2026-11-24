import { createHash, createPrivateKey, createSign } from "node:crypto";
import { supabaseAdmin } from "./supabase-admin";

type Credentials = { project_id: string; client_email: string; private_key: string };
type Kind = "chat" | "call";
let cached: { token: string; expires: number } | null = null;

function credentials(): Credentials | null {
  try {
    const raw = process.env.SOLSTONE_FCM_SERVICE_ACCOUNT_BASE64;
    if (!raw) return null;
    const c = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as Credentials;
    if (!/^[a-z][a-z0-9-]{4,62}$/.test(c.project_id) ||
        !/^[^\s@]+@[^\s@]+\.gserviceaccount\.com$/.test(c.client_email)) return null;
    if (createPrivateKey(c.private_key).asymmetricKeyType !== "rsa") return null;
    return c;
  } catch { return null; }
}
export const nativePushConfigured = () => credentials() !== null;
export const sessionHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const deviceBinding = (session: string, device: string) =>
  createHash("sha256").update(session).update(":").update(device).digest("hex");

export async function revokeNativeSession(session: string) {
  if (!nativePushConfigured()) return;
  try {
    const { error } = await supabaseAdmin.from("solstone_native_push_devices")
      .delete().eq("session_hash", sessionHash(session));
    if (error) throw error;
  } catch { console.error("Solstone native push session revoke failed"); }
}

async function accessToken(c: Credentials) {
  if (cached && cached.expires > Date.now() + 60000) return cached.token;
  const b64 = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const now = Math.floor(Date.now()/1000);
  const jwt = b64({alg:"RS256",typ:"JWT"}) + "." + b64({
    iss:c.client_email, scope:"https://www.googleapis.com/auth/firebase.messaging",
    aud:"https://oauth2.googleapis.com/token", iat:now, exp:now+3600,
  });
  const assertion = jwt + "." + createSign("RSA-SHA256").update(jwt).sign(c.private_key,"base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion}),
    signal:AbortSignal.timeout(5000), redirect:"error",
  });
  if (!response.ok) throw new Error("FCM OAuth failed");
  const result = await response.json();
  if (typeof result.access_token !== "string") throw new Error("FCM OAuth response invalid");
  cached = {token:result.access_token,expires:Date.now()+Math.min(Number(result.expires_in)||300,3600)*1000};
  return cached.token;
}

/** Receives only server-authorized recipients; no message contents or employee names leave the server. */
export async function notifyNativeWorkers(ids: string[], kind: Kind) {
  const config = credentials();
  if (!config || !ids.length) return;
  try {
    const {data:workers,error:workerError}=await supabaseAdmin.from("workers")
      .select("id").eq("active",true).in("id",ids);
    if (workerError) throw workerError;
    const active = (workers??[]).map(w=>String(w.id));
    if (!active.length) return;
    const {data,error}=await supabaseAdmin.from("solstone_native_push_devices")
      .select("token,binding").in("worker_id",active)
      .gt("expires_at",new Date().toISOString()).limit(200);
    if (error) throw error;
    if (!data?.length) return;
    const bearer=await accessToken(config);
    const expires=String(Date.now()+(kind==="call"?25000:120000));
    for(let i=0;i<data.length;i+=20) {
      await Promise.allSettled(data.slice(i,i+20).map(async d=>{
        const r=await fetch("https://fcm.googleapis.com/v1/projects/"+config.project_id+"/messages:send",{
          method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+bearer},
          body:JSON.stringify({message:{token:d.token,data:{kind,binding:d.binding,expires},
            android:{priority:"HIGH",ttl:kind==="call"?"25s":"120s"}}}),
          signal:AbortSignal.timeout(5000),redirect:"error",
        });
        if (!r.ok) {
          const e=await r.json().catch(()=>null);
          if (r.status===404 && e?.error?.details?.some((x:{errorCode?:string})=>x.errorCode==="UNREGISTERED")) {
            await supabaseAdmin.from("solstone_native_push_devices").delete().eq("token",d.token).eq("binding",d.binding);
          } else console.error("Solstone FCM send failed",r.status);
        }
      }));
    }
  } catch { console.error("Solstone native push dispatch unavailable"); }
}
