"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import WorkerAiChat from "./WorkerAiChat";

/**
 * Web and hosted mobile wrapper share this same authenticated AI entry.
 * API data remains server-only; this control is merely navigation.
 */
export default function SolstoneAIEntry() {
  const path = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [adminDashboard, setAdminDashboard] = useState(false);
  const [workerDashboard, setWorkerDashboard] = useState(false);

  useEffect(() => {
    if (!path || path === "/" || path.startsWith("/login") || path.startsWith("/assistant")) {
      setAuthorized(false);
      return;
    }
    let active = true;
    void fetch("/api/auth/login", { credentials: "include", cache: "no-store" })
      .then(async response => {
        const json = await response.json().catch(() => ({}));
        if (active) {
          setAuthorized(response.ok);
          setAdminDashboard(path === "/dashboard" && json?.user?.role === "admin");
          setWorkerDashboard(json?.user?.role === "worker");
        }
      })
      .catch(() => { if (active) setAuthorized(false); });
    return () => { active = false; };
  }, [path]);

  if (!authorized || adminDashboard || !path || path === "/" || path.startsWith("/login") || path.startsWith("/assistant")) {
    return null;
  }

  if (workerDashboard) return <WorkerAiChat mode="floating" />;

  return <Link href="/assistant" aria-label="Solstone AI pomoćnik" title="Solstone AI"
    style={{
      position: "fixed", right: 12, bottom: 12, zIndex: 110,
      background: "#1e3a54", border: "1px solid #fdba74",
      color: "#fff", padding: "8px 12px", borderRadius: 13,
      boxShadow: "0 4px 15px #0009", textDecoration: "none",
      fontFamily: "system-ui, sans-serif", fontWeight: 750,
      display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.25
    }}>
      <span aria-hidden="true" style={{ fontSize: 21, animation: "solstoneWalk 1.2s ease-in-out infinite" }}>🚶</span>
      <span style={{ fontSize: 11 }}>AI</span>
    </Link>;
}
