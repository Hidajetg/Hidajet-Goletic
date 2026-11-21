"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { readAppLanguage } from "../lib/language";

type Call = {
  id:string;caller_id:number;callee_id:number;status:string;
  callerName?:string;calleeName?:string;created_at:string;expires_at:string;
};
type Signal = {id:number;kind:"offer"|"answer"|"candidate";payload:Record<string,unknown>};
type Phase = "incoming"|"calling"|"connecting"|"connected";

const CALLS_ENABLED = process.env.NEXT_PUBLIC_SOLSTONE_CALLS_ENABLED === "true";

const TEXT = {
  de:{incoming:"Eingehender Anruf",calling:"Wird angerufen",connecting:"Verbindung wird hergestellt",
    connected:"Verbunden",accept:"Annehmen",decline:"Ablehnen",end:"Auflegen",mute:"Stumm",unmute:"Ton an",
    failed:"Sprachverbindung nicht verfügbar. Netzwerkeinstellungen prüfen."},
  ba:{incoming:"Dolazni poziv",calling:"Pozivanje",connecting:"Uspostavljam vezu",
    connected:"Povezano",accept:"Prihvati",decline:"Odbij",end:"Završi",mute:"Isključi mikrofon",
    unmute:"Uključi mikrofon",failed:"Glasovna veza nije uspjela. Provjeri mrežu."},
  uz:{incoming:"Kiruvchi qo‘ng‘iroq",calling:"Qo‘ng‘iroq qilinmoqda",connecting:"Ulanmoqda",
    connected:"Ulandi",accept:"Qabul qilish",decline:"Rad etish",end:"Tugatish",mute:"Mikrofonni o‘chirish",
    unmute:"Mikrofonni yoqish",failed:"Ovozli aloqa ishlamadi. Tarmoqni tekshiring."},
  cz:{incoming:"Příchozí hovor",calling:"Volání",connecting:"Připojování",
    connected:"Spojeno",accept:"Přijmout",decline:"Odmítnout",end:"Zavěsit",mute:"Ztlumit",
    unmute:"Zapnout mikrofon",failed:"Hlasový hovor se nezdařil. Zkontrolujte síť."},
  en:{incoming:"Incoming call",calling:"Calling",connecting:"Connecting",
    connected:"Connected",accept:"Accept",decline:"Decline",end:"Hang up",mute:"Mute",
    unmute:"Unmute",failed:"Audio connection failed. Check the network."},
} as const;

async function callApi<T>(path:string,init?:RequestInit):Promise<T> {
  const response=await fetch(path,{credentials:"include",cache:"no-store",...init});
  const data=await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(String(data.error??"Call unavailable"));
  return data as T;
}
function jsonRequest(body:unknown,method="POST"):RequestInit {
  return {method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)};
}

/**
 * Test-only 1:1 browser WebRTC voice calls. Public STUN is not a TURN relay:
 * mobile carrier-to-carrier calls can fail until a TURN service is configured.
 * iOS PWA cannot mimic native full-screen CallKit ringing while closed.
 */
export default function SolstoneCalls() {
  const pathname=usePathname();
  const [call,setCall]=useState<Call|null>(null);
  const [phase,setPhase]=useState<Phase>("incoming");
  const [error,setError]=useState("");
  const [muted,setMuted]=useState(false);
  const [lang,setLang]=useState<keyof typeof TEXT>("de");
  const [busy,setBusy]=useState(false);
  const activeRef=useRef<Call|null>(null);
  const ownIdRef=useRef("");
  const pcRef=useRef<RTCPeerConnection|null>(null);
  const mediaRef=useRef<MediaStream|null>(null);
  const remoteRef=useRef<HTMLAudioElement|null>(null);
  const lastSignalRef=useRef(0);
  const pendingCandidates=useRef<RTCIceCandidateInit[]>([]);
  const startingRef=useRef(false);
  const signalBusy=useRef(false);
  const pollingBusy=useRef(false);
  const text=TEXT[lang];

  const cleanup=useCallback(()=>{
    pcRef.current?.close();
    pcRef.current=null;
    mediaRef.current?.getTracks().forEach((track)=>track.stop());
    mediaRef.current=null;
    if(remoteRef.current) remoteRef.current.srcObject=null;
    activeRef.current=null;
    lastSignalRef.current=0;
    pendingCandidates.current=[];
    setCall(null);
    setMuted(false);
    setBusy(false);
  },[]);

  const openMicrophone=useCallback(async()=>{
    if (mediaRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection==="undefined") {
      throw new Error("WebRTC/microphone is not supported on this device.");
    }
    mediaRef.current=await navigator.mediaDevices.getUserMedia({
      audio:{echoCancellation:true,noiseSuppression:true},video:false,
    });
  },[]);

  const peerFor=useCallback((id:string, iceServers: RTCIceServer[])=>{
    if (pcRef.current) return pcRef.current;
    if (!mediaRef.current) throw new Error("Microphone not ready");
    const pc=new RTCPeerConnection({iceServers});
    for (const track of mediaRef.current.getTracks()) {
      pc.addTrack(track,mediaRef.current);
    }
    pc.onicecandidate=(event)=>{
      if (!event.candidate || activeRef.current?.id!==id) return;
      void callApi("/api/team-calls/signal",
        jsonRequest({callId:id,kind:"candidate",payload:event.candidate.toJSON()})).catch(()=>{});
    };
    pc.ontrack=(event)=>{
      if (!remoteRef.current) return;
      remoteRef.current.srcObject=event.streams[0] ?? new MediaStream([event.track]);
      void remoteRef.current.play().catch(()=>{});
    };
    pc.onconnectionstatechange=()=>{
      if (pc.connectionState==="connected") setPhase("connected");
      if (pc.connectionState==="failed") setError(TEXT[readAppLanguage("de")].failed);
    };
    pcRef.current=pc;
    return pc;
  },[]);

  const startCall=useCallback(async (targetWorkerId:string)=>{
    if (!/^\d+$/.test(targetWorkerId) || activeRef.current || startingRef.current) return;
    startingRef.current=true;
    setError("");
    setBusy(true);
    try {
      // Browser microphone request is initiated by a direct user click.
      await openMicrophone();
      const {iceServers}=await callApi<{iceServers:RTCIceServer[]}>("/api/team-calls/ice");
      const {call:newCall}=await callApi<{call:Call}>(
        "/api/team-calls",jsonRequest({targetWorkerId}));
      activeRef.current=newCall;
      lastSignalRef.current=0;
      setCall(newCall);
      setPhase("calling");
      const pc=peerFor(newCall.id,iceServers);
      const offer=await pc.createOffer();
      await pc.setLocalDescription(offer);
      await callApi("/api/team-calls/signal",
        jsonRequest({callId:newCall.id,kind:"offer",payload:offer}));
    } catch (err) {
      // A failed offer must not leave the recipient's number permanently busy.
      const failedId=activeRef.current?.id;
      cleanup();
      if (failedId) {
        await callApi("/api/team-calls",
          jsonRequest({callId:failedId,action:"end"},"PATCH")).catch(()=>{});
      }
      setError(err instanceof Error?err.message:text.failed);
    } finally {
      startingRef.current=false;
      setBusy(false);
    }
  },[cleanup,openMicrophone,peerFor,text.failed]);

  const acceptCall=useCallback(async()=>{
    const selected=activeRef.current;
    if(!selected || busy) return;
    setBusy(true);
    setError("");
    try{
      await openMicrophone();
      const {iceServers}=await callApi<{iceServers:RTCIceServer[]}>("/api/team-calls/ice");
      await callApi("/api/team-calls",jsonRequest({callId:selected.id,action:"accept"},"PATCH"));
      peerFor(selected.id,iceServers);
      setPhase("connecting");
    }catch(e){
      // If microphone permission fails, release the ringing call and tracks.
      cleanup();
      await callApi("/api/team-calls",
        jsonRequest({callId:selected.id,action:"decline"},"PATCH")).catch(()=>{});
      setError(e instanceof Error?e.message:text.failed);
    }finally{setBusy(false);}
  },[busy,cleanup,openMicrophone,peerFor,text.failed]);

  const finishCall=useCallback(async(action:"decline"|"end")=>{
    const id=activeRef.current?.id;
    cleanup();
    if (!id) return;
    try { await callApi("/api/team-calls",
      jsonRequest({callId:id,action},"PATCH")); }
    catch {/* The remote status poll also detects a dropped network. */}
  },[cleanup]);

  const checkCalls=useCallback(async()=>{
    if (pollingBusy.current) return;
    pollingBusy.current=true;
    try {
      const data=await callApi<{userId:string;calls:Call[];active:Call[]}>("/api/team-calls");
      ownIdRef.current=String(data.userId);
      const selected=activeRef.current;
      if (selected) {
        const latest=data.calls.find((c)=>c.id===selected.id);
        if(!latest || !["ringing","accepted"].includes(latest.status)) {
          cleanup();
          return;
        }
        activeRef.current=latest;
        setCall(latest);
        if (latest.status==="accepted" && !pcRef.current) setPhase("connecting");
      } else {
        const incoming=data.active.find((c)=>String(c.callee_id)===ownIdRef.current &&
          c.status==="ringing");
        if (incoming) {
          activeRef.current=incoming;
          setCall(incoming);
          setPhase("incoming");
          if(localStorage.getItem("solstone_chat_sound")!=="false") {
            const tone=new Audio("/sounds/notification.mp3");
            void tone.play().catch(()=>{});
          }
          if(typeof navigator.vibrate==="function") navigator.vibrate([200,100,200]);
        }
      }
    } catch {
      // Chat and existing app must keep working when signaling is unavailable.
    } finally {
      pollingBusy.current=false;
    }
  },[cleanup]);

  const readSignals=useCallback(async()=>{
    const selected=activeRef.current;
    const pc=pcRef.current;
    if (!selected || !pc || signalBusy.current) return;
    signalBusy.current=true;
    try {
      const result=await callApi<{callStatus:string;signals:Signal[]}>(
        "/api/team-calls/signal?callId="+encodeURIComponent(selected.id)+
        "&after="+String(lastSignalRef.current));
      if(!["ringing","accepted"].includes(result.callStatus)) {
        cleanup();return;
      }
      for (const signal of result.signals) {
        if(!activeRef.current || !pcRef.current) return;
        lastSignalRef.current=Math.max(lastSignalRef.current,Number(signal.id));
        if(signal.kind==="offer" && String(selected.callee_id)===ownIdRef.current &&
           !pc.remoteDescription){
          await pc.setRemoteDescription(signal.payload as unknown as RTCSessionDescriptionInit);
          for(const ice of pendingCandidates.current) await pc.addIceCandidate(ice);
          pendingCandidates.current=[];
          const answer=await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await callApi("/api/team-calls/signal",
            jsonRequest({callId:selected.id,kind:"answer",payload:answer}));
        } else if(signal.kind==="answer" && String(selected.caller_id)===ownIdRef.current &&
                  !pc.remoteDescription){
          await pc.setRemoteDescription(signal.payload as unknown as RTCSessionDescriptionInit);
          for(const ice of pendingCandidates.current) await pc.addIceCandidate(ice);
          pendingCandidates.current=[];
          setPhase("connecting");
        } else if(signal.kind==="candidate") {
          const candidate=signal.payload as RTCIceCandidateInit;
          if(pc.remoteDescription) await pc.addIceCandidate(candidate);
          else pendingCandidates.current.push(candidate);
        }
      }
    }catch(e){
      setError(e instanceof Error?e.message:text.failed);
    }finally{signalBusy.current=false;}
  },[cleanup,text.failed]);

  useEffect(()=>{
    setLang(readAppLanguage("de"));
  },[]);
  useEffect(()=>{
    const listener=(event:Event)=>{
      const id=String((event as CustomEvent<{targetWorkerId:string}>).detail?.targetWorkerId??"");
      void startCall(id);
    };
    if (!CALLS_ENABLED) return;
    window.addEventListener("solstone-call-start",listener);
    return()=>window.removeEventListener("solstone-call-start",listener);
  },[startCall]);
  useEffect(()=>{
    if (!CALLS_ENABLED || !pathname || pathname==="/" || pathname.startsWith("/login")) return;
    let cancelled=false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function tick() {
      // Avoid burning function invocations and mobile battery while idle.
      // Locked-phone incoming call alerts are handled by the service worker.
      if (document.visibilityState==="visible" || activeRef.current) {
        await checkCalls();
      }
      if (!cancelled) timer=setTimeout(()=>void tick(),activeRef.current?3000:10000);
    }
    const visible=()=>{
      if(document.visibilityState==="visible") void checkCalls();
    };
    document.addEventListener("visibilitychange",visible);
    void tick();
    return()=>{
      cancelled=true;
      if(timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange",visible);
    };
  },[pathname,checkCalls]);
  useEffect(()=>{
    if (!CALLS_ENABLED) return;
    const timer=setInterval(()=>void readSignals(),1050);
    return()=>clearInterval(timer);
  },[readSignals]);
  useEffect(()=>()=>cleanup(),[cleanup]);

  function changeMute(){
    const audio=mediaRef.current?.getAudioTracks()[0];
    if(!audio) return;
    audio.enabled=!audio.enabled;
    setMuted(!audio.enabled);
  }

  if (!CALLS_ENABLED || (!call && !error)) return null;
  const isCaller=call && String(call.caller_id)===ownIdRef.current;
  const peerName=call
    ? isCaller ? (call.calleeName??"Mitarbeiter"):(call.callerName??"Mitarbeiter")
    : "Solstone";
  return <div style={{
    position:"fixed",bottom:20,left:12,right:12,zIndex:99999,pointerEvents:"none",
    display:"flex",justifyContent:"center",
  }}>
    <section role="dialog" aria-label="Solstone audio call"
      style={{pointerEvents:"auto",maxWidth:380,width:"100%",padding:18,color:"#fff",
        background:"#172537",border:"1px solid #7183a0",borderRadius:18,
        boxShadow:"0 18px 50px #0008",fontFamily:"system-ui,sans-serif"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:30}} aria-hidden="true">📞</span>
        <div style={{flex:1,minWidth:0}}>
          <strong style={{display:"block",fontSize:17}}>{peerName}</strong>
          <small style={{color:"#c2d3e5"}}>
            {call?text[phase]:"Solstone"}
          </small>
        </div>
      </div>
      {error && <div role="alert" style={{marginTop:10,fontSize:13,color:"#ffb7b7"}}>{error}</div>}
      <audio ref={remoteRef} autoPlay playsInline />
      <div style={{display:"flex",gap:10,marginTop:15}}>
        {call && phase==="incoming" && !isCaller && <>
          <button type="button" disabled={busy}
            onClick={()=>void acceptCall()}
            style={{flex:1,padding:12,borderRadius:11,background:"#16864c",color:"white",fontWeight:700}}>
            {text.accept}
          </button>
          <button type="button" disabled={busy}
            onClick={()=>void finishCall("decline")}
            style={{flex:1,padding:12,borderRadius:11,background:"#aa2838",color:"white"}}>
            {text.decline}
          </button>
        </>}
        {call && (isCaller || phase!=="incoming") && <>
          <button type="button" onClick={changeMute} disabled={!mediaRef.current}
            style={{flex:1,padding:12,borderRadius:11,background:"#33475e",color:"white"}}>
            {muted?text.unmute:text.mute}
          </button>
          <button type="button" onClick={()=>void finishCall("end")}
            style={{flex:1,padding:12,borderRadius:11,background:"#aa2838",color:"white"}}>
            {text.end}
          </button>
        </>}
        {!call && error && <button type="button" onClick={()=>setError("")}
          style={{padding:10,borderRadius:10,background:"#42546c",color:"white"}}>OK</button>}
      </div>
    </section>
  </div>;
}
