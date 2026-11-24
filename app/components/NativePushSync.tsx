"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { nativePushBridge, nativePushOptedIn, syncNativePush, clearNativePushBinding } from "../lib/native-push-client";
export default function NativePushSync(){
  const path=usePathname();
  useEffect(()=>{
    if(!nativePushBridge()) return;
    if(path?.startsWith("/login")) {void clearNativePushBinding().catch(()=>{});return;}
    const refresh=()=>{
      if(document.visibilityState==="visible"&&nativePushOptedIn()) void syncNativePush().catch(()=>{});
    };
    refresh();
    document.addEventListener("visibilitychange",refresh);
    const interval=setInterval(refresh,5*60*1000);
    return()=>{document.removeEventListener("visibilitychange",refresh);clearInterval(interval);};
  },[path]);
  return null;
}
