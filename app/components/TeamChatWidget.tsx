"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import "./team-chat-widget.css";

/**
 * The small upper-right chat launcher is only a link.
 * Clicking it navigates to a real Team Chat page, never a floating iframe.
 * All authorization checks remain in the existing server-side chat API.
 */
export default function TeamChatWidget() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const onUnread = (event: Event) => {
      const count = Number((event as CustomEvent<number>).detail);
      setUnread(Number.isFinite(count) ? Math.min(Math.max(0, count), 999) : 0);
    };
    window.addEventListener("solstone-chat-unread", onUnread);
    return () => window.removeEventListener("solstone-chat-unread", onUnread);
  }, []);

  const hidden = !pathname ||
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/login-secure" ||
    pathname.startsWith("/team-chat");

  if (hidden) return null;

  const siteId = pathname.startsWith("/baustellen/") ? pathname.split("/")[2] : "";
  const href = /^\d+$/.test(siteId)
    ? "/team-chat?siteId=" + encodeURIComponent(siteId)
    : "/team-chat";

  return (
    <div className="sw-widget" data-testid="solstone-chat-page-link">
      <Link
        href={href}
        className="sw-launcher"
        aria-label="Otvori Solstone Team Chat kao novu stranicu"
        title="Solstone Team Chat"
      >
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>
        </svg>
        {unread > 0 && <span className="sw-unread" aria-label={unread + " novih poruka"}>
          {unread > 99 ? "99+" : unread}
        </span>}
      </Link>
    </div>
  );
}
