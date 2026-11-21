"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const SW = fs.readFileSync(
  path.join(process.cwd(), "public/solstone-push-sw.js"), "utf8"
);
const ORIGIN = "https://solstone.example";

function response(value, ok = true) {
  return { ok, json: async () => value };
}

function boot({ callResponse = response({}, false), chatResponse = response({}, false), windows = [] } = {}) {
  const events = new Map();
  const notifications = [];
  const visits = [];
  const requests = [];
  const worker = {
    location: { origin: ORIGIN },
    registration: {
      showNotification: async (title, options) => {
        notifications.push({ title, ...options });
      },
    },
    clients: {
      claim: async () => {},
      matchAll: async () => windows,
      openWindow: async (url) => { visits.push(url); return null; },
    },
    skipWaiting: () => {},
    addEventListener: (name, cb) => events.set(name, cb),
  };
  const fetch = async (url, options) => {
    requests.push({ url, options });
    if (url === "/api/team-calls") return callResponse;
    if (url === "/api/team-chat") return chatResponse;
    throw new Error("Unexpected network request: " + url);
  };
  vm.runInNewContext(SW, {
    self: worker, fetch, URL, Date, encodeURIComponent,
  }, { filename: "solstone-push-sw.js", timeout: 2000 });
  return {
    notifications,
    visits,
    requests,
    async push() {
      let pending;
      events.get("push")({ waitUntil: (work) => { pending = work; } });
      assert.ok(pending, "push handler must call waitUntil");
      return await pending;
    },
    async click(notification, { data = notification?.data ?? { url: "/team-chat" } } = {}) {
      let pending;
      let closed = false;
      events.get("notificationclick")({
        notification: { data, close() { closed = true; } },
        waitUntil(work) { pending = work; },
      });
      assert.ok(closed);
      await pending;
    },
  };
}

test("signed-out push does not reveal worker or site names", async () => {
  const w = boot();
  await w.push();
  assert.equal(w.notifications.length, 0);
  assert.equal(w.requests[0].options.credentials, "include");
  assert.equal(w.requests[1].options.credentials, "include");
});

test("a read message does not produce phantom notifications", async () => {
  const w = boot({
    chatResponse: response({ rooms: [
      { id: "room-123", unread: 0, lastMessageId: "m1", label: "Site A" },
    ] }),
  });
  await w.push();
  assert.equal(w.notifications.length, 0);
});

test("unread site message opens the exact authorized site's chat", async () => {
  const w = boot({
    chatResponse: response({ rooms: [
      {
        id: "site-room", kind: "site", siteId: "23",
        unread: 3, lastMessageId: "m2", lastSender: "Radnik A",
        label: "Gradilište 23", lastAt: "2026-11-21T16:00:00.000Z",
      },
    ] }),
  });
  await w.push();
  assert.equal(w.notifications.length, 1);
  const n = w.notifications[0];
  assert.equal(n.title, "Solstone Baustelle");
  assert.equal(n.data.url, "/team-chat?siteId=23");
  assert.ok(n.body.includes("Radnik A"));
  assert.equal(n.body.includes("tekst poruke"), false);
});

test("private unread message opens its conversation, not another worker's", async () => {
  const id = "b4d79aaa-3bfb-4e9e-8d5c-6f37db560f55";
  const w = boot({
    chatResponse: response({ rooms: [
      {
        id, kind: "private", unread: 1, lastMessageId: "m5",
        lastSender: "Worker", label: "Privat", lastAt: "2026-11-21T16:01:00.000Z",
      },
    ] }),
  });
  await w.push();
  assert.equal(w.notifications[0].data.url, "/team-chat?roomId=" + id);
  await w.click(w.notifications[0]);
  assert.deepEqual(w.visits, [ORIGIN + "/team-chat?roomId=" + id]);
});

test("only current user's non-expired incoming call is surfaced", async () => {
  const w = boot({
    callResponse: response({
      userId: "2",
      active: [
        {
          status: "ringing", callee_id: 3, callerName: "Unrelated",
          expires_at: new Date(Date.now() + 60000).toISOString(),
        },
        {
          status: "ringing", callee_id: 2, callerName: "Admin",
          expires_at: new Date(Date.now() + 60000).toISOString(),
        },
      ],
    }),
  });
  await w.push();
  assert.equal(w.notifications.length, 1);
  assert.equal(w.notifications[0].tag, "solstone-incoming-call");
  assert.ok(w.notifications[0].body.includes("Admin"));
  assert.ok(!w.notifications[0].body.includes("Unrelated"));
  assert.equal(w.requests.length, 1, "active call must not trigger extra chat fetch");
});

test("expired incoming call does not produce a false ring", async () => {
  const w = boot({
    callResponse: response({
      userId: "2",
      active: [{
        status: "ringing", callee_id: 2, callerName: "Admin",
        expires_at: new Date(Date.now() - 20000).toISOString(),
      }],
    }),
  });
  await w.push();
  assert.equal(w.notifications.length, 0);
});

test("notification clicks never navigate to an attacker-controlled origin", async () => {
  const attacker = "https://attacker.example/steal";
  const evilWindow = {
    url: ORIGIN + ".attacker.example",
    navigate: async () => { throw new Error("cross-origin navigation attempted"); },
    focus: async () => { throw new Error("cross-origin focus attempted"); },
  };
  const w = boot({ windows: [evilWindow] });
  await w.click(null, { data: { url: attacker } });
  assert.deepEqual(w.visits, [ORIGIN + "/team-chat"]);
});

test("notification click reuses a same-origin window", async () => {
  const visits = [];
  const window = {
    url: ORIGIN + "/dashboard",
    navigate: async (url) => { visits.push(url); },
    focus: async () => { visits.push("focus"); },
  };
  const w = boot({ windows: [window] });
  await w.click(null, { data: { url: "/team-chat?siteId=23" } });
  assert.deepEqual(visits, [ORIGIN + "/team-chat?siteId=23", "focus"]);
  assert.deepEqual(w.visits, []);
});
