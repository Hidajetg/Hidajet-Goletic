"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import "./team-chat-widget.css";

/**
 * Small, ChatGPT-like top-corner chat launcher.
 *
 * We embed the EXISTING authorized Team Chat route so its actual private/site
 * membership checks, photo/PDF/voice uploads and translations are reused.
 * The iframe is same-origin and receives no session credentials via URL.
 *
 * Closed widget has no chat iframe, network fetch or screen-space overlay.
 */
export default function TeamChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [groupFullscreen, setGroupFullscreen] = useState(false);
  const [unread, setUnread] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const hidden = !pathname ||
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/login-secure" ||
    pathname.startsWith("/team-chat");

  useEffect(() => {
    const onUnread = (event: Event) => {
      const count = Number((event as CustomEvent<number>).detail);
      setUnread(Number.isFinite(count) ? Math.min(Math.max(0, count), 999) : 0);
    };
    window.addEventListener("solstone-chat-unread", onUnread);
    return () => window.removeEventListener("solstone-chat-unread", onUnread);
  }, []);

  // The embedded Team Chat notifies this shell when a group tab/room is opened.
  // Accept events only from this exact same-origin iframe.
  useEffect(() => {
    const onViewChange = (event: MessageEvent) => {
      if (event.origin !== window.location.origin ||
          event.source !== frameRef.current?.contentWindow ||
          !event.data || event.data.type !== "solstone-chat-view") return;
      if (event.data.mode === "group-fullscreen") setGroupFullscreen(true);
      if (event.data.mode === "compact") setGroupFullscreen(false);
    };
    window.addEventListener("message", onViewChange);
    return () => window.removeEventListener("message", onViewChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setGroupFullscreen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  // Avoid scrolling the underlying Baustelle while its group chat is full-screen.
  useEffect(() => {
    if (!open || !groupFullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open, groupFullscreen]);

  useEffect(() => {
    // Never keep a confidential conversation visible when navigating to login.
    if (hidden) { setOpen(false); setGroupFullscreen(false); }
  }, [hidden]);

  if (hidden) return null;

  const caption = "Solstone Team Chat";
  return (
    <div className="sw-widget" data-testid="solstone-floating-chat">
      <button
        ref={buttonRef}
        type="button"
        className={"sw-launcher" + (open ? " sw-active" : "")}
        aria-label={open ? "Zatvori Team Chat" : "Otvori Team Chat"}
        aria-expanded={open}
        aria-controls="solstone-chat-popover"
        onClick={() => { setOpen((old) => !old); setGroupFullscreen(false); }}
      >
        <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>
        </svg>
        {unread > 0 && <span className="sw-unread" aria-label={unread + " novih poruka"}>
          {unread > 99 ? "99+" : unread}
        </span>}
      </button>

      {open && <section
        ref={dialogRef}
        id="solstone-chat-popover"
        className={"sw-panel" + (groupFullscreen ? " sw-panel-fullscreen" : "")}
        role="region"
        aria-label={caption}
      >
        <div className="sw-panel-header">
          <span className="sw-panel-emblem" aria-hidden="true">💬</span>
          <div className="sw-panel-title">
            <strong>{caption}</strong>
            <small>Grupe · Privatno · Obavijesti</small>
          </div>
          {groupFullscreen && <button type="button" className="sw-panel-compact" aria-label="Smanji grupni chat"
            onClick={() => setGroupFullscreen(false)}>↙ Smanji</button>}
          <button type="button" className="sw-panel-close" aria-label="Zatvori chat"
            onClick={() => {
              setOpen(false);
              setGroupFullscreen(false);
              buttonRef.current?.focus();
            }}>✕</button>
        </div>
        <iframe
          ref={frameRef}
          key={pathname.startsWith("/baustellen/") ? pathname.split("/")[2] : "all"}
          src={pathname.startsWith("/baustellen/") && /^\d+$/.test(pathname.split("/")[2] || "")
            ? "/team-chat?compact=1&siteId=" + encodeURIComponent(pathname.split("/")[2])
            : "/team-chat?compact=1"}
          className="sw-panel-frame"
          title={caption}
          loading="eager"
          referrerPolicy="same-origin"
        />
      </section>}
    </div>
  );
}
