"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import "./solstone-mobile-nav.css";

type User = { id: string; name: string; role: "admin" | "worker" };
type Lang = "de"|"ba"|"uz"|"cz"|"en";
const labels: Record<Lang,{home:string,chat:string,ai:string,profile:string,role:string,close:string}> = {
  de:{home:"Start",chat:"Chat",ai:"AI",profile:"Profil",role:"Rolle",close:"Schließen"},
  ba:{home:"Početna",chat:"Chat",ai:"AI",profile:"Profil",role:"Uloga",close:"Zatvori"},
  uz:{home:"Bosh sahifa",chat:"Chat",ai:"AI",profile:"Profil",role:"Rol",close:"Yopish"},
  cz:{home:"Domů",chat:"Chat",ai:"AI",profile:"Profil",role:"Role",close:"Zavřít"},
  en:{home:"Home",chat:"Chat",ai:"AI",profile:"Profile",role:"Role",close:"Close"},
};
const valid = new Set(Object.keys(labels));

/**
 * Native-like bottom navigation for the REAL Next.js app (not the offline
 * UiPreview). Works in a mobile browser and in the hosted Android/iOS test.
 * No permissions are inferred from the selected UI tab or localStorage.
 */
export default function SolstoneMobileNav() {
  const pathname = usePathname();
  const [user,setUser] = useState<User|null>(null);
  const [lang,setLang] = useState<Lang>("ba");
  const [profileOpen,setProfileOpen] = useState(false);

  useEffect(()=>{
    const candidate=(localStorage.getItem("appLanguage")||localStorage.getItem("lang")||"ba").toLowerCase();
    if(valid.has(candidate))setLang(candidate as Lang);
  },[pathname]);

  useEffect(()=>{
    setProfileOpen(false);
    if(!pathname || pathname === "/" || pathname.startsWith("/login")){
      setUser(null);
      return;
    }
    let active=true;
    fetch("/api/auth/login",{credentials:"include",cache:"no-store"})
      .then(async resp=>{
        if(!active)return;
        if(!resp.ok){setUser(null);return;}
        const payload=await resp.json();
        const u=payload?.user;
        if(!u || !/^\d+$/.test(String(u.id))) {setUser(null);return;}
        setUser({
          id:String(u.id),
          name:String(u.name||""),
          role:String(u.role)==="admin"?"admin":"worker",
        });
      }).catch(()=>{if(active)setUser(null)});
    return ()=>{active=false};
  },[pathname]);

  if(!user || !pathname || pathname.startsWith("/login") ||
    pathname.startsWith("/assistant") || pathname.startsWith("/team-chat")) return null;

  const t=labels[lang];
  const siteMatch=pathname.match(/^\/baustellen\/(\d+)(?:\/|$)/);
  const chatLink=siteMatch?"/team-chat?siteId="+encodeURIComponent(siteMatch[1]):"/team-chat";
  return <>
    <nav className="solstone-mobile-nav" aria-label="Solstone mobilna navigacija">
      <Link href="/dashboard" className={pathname==="/dashboard"?"active":""}>
        <span aria-hidden="true">⌂</span><small>{t.home}</small>
      </Link>
      <Link href={chatLink}>
        <span aria-hidden="true">💬</span><small>{t.chat}</small>
      </Link>
      <Link href="/assistant" className="solstone-mobile-ai">
        <span className="solstone-mobile-walker" aria-hidden="true">🚶</span><small>{t.ai}</small>
      </Link>
      <button type="button" aria-label={t.profile} onClick={()=>setProfileOpen(true)}>
        <span aria-hidden="true">♙</span><small>{t.profile}</small>
      </button>
    </nav>
    {profileOpen && <div className="solstone-mobile-profile-backdrop"
      role="presentation" onClick={()=>setProfileOpen(false)}>
      <section className="solstone-mobile-profile" role="dialog" aria-modal="true"
        aria-label={t.profile} onClick={event=>event.stopPropagation()}>
        <div className="solstone-mobile-profile-head">
          <strong>{t.profile}</strong>
          <button type="button" aria-label={t.close}
            onClick={()=>setProfileOpen(false)}>✕</button>
        </div>
        <p><b>{user.name}</b></p>
        <p>{t.role}: {user.role==="admin"?"Admin":"Radnik"}</p>
        <button className="solstone-mobile-close" type="button"
          onClick={()=>setProfileOpen(false)}>{t.close}</button>
      </section>
    </div>}
  </>;
}
