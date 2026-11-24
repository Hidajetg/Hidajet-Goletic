"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Web and hosted mobile wrapper share this same authenticated AI entry.
 * API data remains server-only; this control is merely navigation.
 */
export default function SolstoneAIEntry() {
  const path = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (path !== "/dashboard") {
      setAuthorized(false);
      return;
    }
    let active = true;
    void fetch("/api/auth/login", { credentials: "include", cache: "no-store" })
      .then(response => { if (active) setAuthorized(response.ok); })
      .catch(() => { if (active) setAuthorized(false); });
    return () => { active = false; };
  }, [path]);

  if (!authorized || path !== "/dashboard") {
    return null;
  }

  return <Link href="/assistant" aria-label="Solstone AI pomoćnik" title="Solstone AI"
    style={{
      position: "fixed", right: 12, bottom: 12, zIndex: 110,
      background: "#1e3a54", border: "1px solid #fdba74",
      color: "#fff", padding: "4px 8px", minWidth: 44, minHeight: 44, boxSizing: "border-box", borderRadius: 11,
      boxShadow: "0 4px 15px #0009", textDecoration: "none",
      fontFamily: "system-ui, sans-serif", fontWeight: 750,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.15
    }}>
      <span aria-hidden="true" style={{ fontSize: 16, animation: "solstoneWalk 1.2s ease-in-out infinite" }}>🚶</span>
      <span style={{ fontSize: 10 }}>AI</span>
    </Link>;
}
