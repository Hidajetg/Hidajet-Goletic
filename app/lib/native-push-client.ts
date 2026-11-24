"use client";
type NativePush = {
  status():Promise<{enabled:boolean;configured:boolean}>;
  registration(options:{prompt:boolean}):Promise<{token?:string}>;
  bind(options:{binding:string;expiresAt:number}):Promise<void>;
  clear():Promise<void>;
};
const optIn="solstone_native_push_enabled";
export function nativePushBridge():NativePush|null {
  if(typeof window==="undefined") return null;
  const c=(window as Window & {Capacitor?:{getPlatform?:()=>string;Plugins?:{SolstonePush?:NativePush}}}).Capacitor;
  return c?.getPlatform?.()==="android" ? c.Plugins?.SolstonePush??null : null;
}
let pending:Promise<void>|null=null;
let epoch=0;
export function nativePushOptedIn(){return localStorage.getItem(optIn)==="true";}
export function syncNativePush(prompt=false):Promise<void>{
  if(pending) return pending;
  const runEpoch=epoch;
  pending=(async()=>{
    const native=nativePushBridge();
    if(!native) throw Error("Android push nije dostupan.");
    if(!prompt&&!nativePushOptedIn()) return;
    const ready=await fetch("/api/team-chat/native-push",{cache:"no-store",credentials:"include"});
    if(ready.status===401){await native.clear();throw Error("Prijava je istekla.");}
    if(!ready.ok || !(await ready.json()).configured) throw Error("Android push još nije konfiguriran.");
    const {token}=await native.registration({prompt});
    if(!token) throw Error("Dozvoli obavijesti u Android postavkama.");
    const response=await fetch("/api/team-chat/native-push",{
      method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({token}),
    });
    if(!response.ok) throw Error("Registracija obavijesti nije uspjela.");
    const data=await response.json();
    if(epoch!==runEpoch || location.pathname.startsWith("/login")) {
      await native.clear(); return;
    }
    await native.bind({binding:data.binding,expiresAt:data.expiresAt});
    localStorage.setItem(optIn,"true");
  })().finally(()=>{pending=null;});
  return pending;
}
export async function clearNativePushBinding(){
  epoch++;
  await nativePushBridge()?.clear();
}
export async function disableNativePush(){
  localStorage.removeItem(optIn);
  epoch++;
  const native=nativePushBridge();
  if(!native) return;
  const token=await native.registration({prompt:false}).then(r=>r.token).catch(()=>undefined);
  await native.clear();
  if(token) await fetch("/api/team-chat/native-push",{
    method:"DELETE",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({token}),
  }).catch(()=>{});
}
