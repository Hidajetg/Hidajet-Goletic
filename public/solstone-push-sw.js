/* Solstone installed PWA Web Push. This service worker does not cache private
 * company records, credentials, documents, or chat messages. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let title = "Solstone Baustelle";
    let body = "Nova poruka u Solstone chatu.";
    let url = "/team-chat";
    try {
      const response = await fetch("/api/team-chat", {
        credentials: "include",
        cache: "no-store",
      });
      // A signed-in user is required. Never show sensitive information for
      // an expired session or a shared device that is no longer logged in.
      if (!response.ok) return;
      const data = await response.json();
      const recent = (Array.isArray(data.rooms) ? data.rooms : [])
        .filter((room) => Number(room.unread) > 0 && room.lastMessageId)
        .sort((a, b) => String(b.lastAt ?? "").localeCompare(String(a.lastAt ?? "")))[0];
      if (recent) {
        body = String(recent.label ?? "Team Chat").slice(0, 90);
        if (recent.lastSender) body += " · " + String(recent.lastSender).slice(0, 70);
        if (recent.kind === "site" && /^\d+$/.test(String(recent.siteId ?? ""))) {
          url = "/team-chat?siteId=" + encodeURIComponent(String(recent.siteId));
        } else if (/^[0-9a-f-]{36}$/i.test(String(recent.id ?? ""))) {
          url = "/team-chat?roomId=" + encodeURIComponent(String(recent.id));
        }
      }
    } catch {
      // Generic notification only; do not cache or embed chat content.
    }
    await self.registration.showNotification(title, {
      body,
      icon: "/icon-512.png",
      badge: "/icon-512.png",
      tag: "solstone-chat-message",
      renotify: true,
      data: { url },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const relative = String(event.notification.data?.url ?? "/team-chat");
    // Open only same-origin paths created by this service worker.
    const next = relative.startsWith("/team-chat") && !relative.startsWith("//")
      ? relative : "/team-chat";
    const absolute = new URL(next, self.location.origin).href;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin)) {
        await client.navigate(absolute);
        return client.focus();
      }
    }
    return self.clients.openWindow(absolute);
  })());
});
