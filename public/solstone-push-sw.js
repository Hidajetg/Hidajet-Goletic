/* Solstone installed Home Screen PWA (iOS/Android browser).
 * No network response is cached. No message body is sent to the push provider.
 * Only an active, server-authorized conversation may trigger a notification.
 * Native Android APK notification delivery requires a separate FCM bridge.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function authorizedGet(path) {
  try {
    const response = await fetch(path, { credentials: "include", cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    const calls = await authorizedGet("/api/team-calls");
    const ringing = (Array.isArray(calls?.active) ? calls.active : []).find((call) =>
      call.status === "ringing" &&
      String(call.callee_id) === String(calls.userId) &&
      Date.parse(String(call.expires_at)) > Date.now()
    );

    if (ringing) {
      await self.registration.showNotification("📞 Solstone Baustelle", {
        body: "Dolazni poziv: " + String(ringing.callerName ?? "Mitarbeiter").slice(0, 85),
        icon: "/icon-512.png",
        badge: "/icon-512.png",
        tag: "solstone-incoming-call",
        renotify: true,
        data: { url: "/team-chat" },
      });
      return;
    }

    const chat = await authorizedGet("/api/team-chat");
    if (!chat) return; // Signed-out or session expired: never expose a name.

    const unread = (Array.isArray(chat.rooms) ? chat.rooms : [])
      .filter((room) => Number(room.unread) > 0 && room.lastMessageId)
      .sort((a, b) => String(b.lastAt ?? "").localeCompare(String(a.lastAt ?? "")))[0];
    if (!unread) return; // No phantom alert for a message that was already read.

    let url = "/team-chat";
    if (unread.kind === "site" && /^\d+$/.test(String(unread.siteId ?? ""))) {
      url += "?siteId=" + encodeURIComponent(String(unread.siteId));
    } else if (/^[0-9a-f-]{36}$/i.test(String(unread.id ?? ""))) {
      url += "?roomId=" + encodeURIComponent(String(unread.id));
    }

    const title = "Solstone Baustelle";
    let body = String(unread.label ?? "Team Chat").slice(0, 90);
    if (unread.lastSender) body += " · " + String(unread.lastSender).slice(0, 70);

    await self.registration.showNotification(title, {
      body,
      icon: "/icon-512.png",
      badge: "/icon-512.png",
      tag: "solstone-chat-" + String(unread.id ?? "message").slice(0, 48),
      renotify: true,
      data: { url },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const path = String(event.notification.data?.url ?? "/team-chat");
    const safePath = path === "/team-chat" || path.startsWith("/team-chat?")
      ? path : "/team-chat";
    const destination = new URL(safePath, self.location.origin).href;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(destination);
        return client.focus();
      }
    }
    return self.clients.openWindow(destination);
  })());
});
