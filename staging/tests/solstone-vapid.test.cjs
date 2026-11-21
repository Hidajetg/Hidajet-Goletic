"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const ts = require("typescript");
const crypto = require("node:crypto");

const source = fs.readFileSync(
  path.join(process.cwd(), "app/lib/web-push.ts"), "utf8"
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function newKeys() {
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  return {
    SOLSTONE_VAPID_PUBLIC_KEY: ecdh.getPublicKey(undefined, "uncompressed").toString("base64url"),
    SOLSTONE_VAPID_PRIVATE_KEY: ecdh.getPrivateKey().toString("base64url"),
    SOLSTONE_VAPID_CONTACT: "mailto:team@example.com",
  };
}

function loadWebPush(env, fetch = async () => ({status: 201})) {
  const exports = {};
  vm.runInNewContext(
    compiled + "\nexports.__test = { vapidAuthorization, sendEmptyWebPush };",
    {
      exports,
      require: (module) => {
        if (module === "node:crypto") return crypto;
        if (module === "./supabase-admin") return { supabaseAdmin: {} };
        if (module === "./team-chat") return { currentViennaDate: () => "2026-11-21" };
        throw Error("Unexpected dependency " + module);
      },
      Buffer,
      URL,
      AbortSignal,
      console,
      fetch,
      process: { env },
      setTimeout,
    },
    { filename: "web-push.compiled.cjs", timeout: 2000 }
  );
  return exports;
}

test("a matching P-256 VAPID pair is accepted without exposing the private key", () => {
  const env = newKeys();
  const push = loadWebPush(env);
  assert.equal(push.webPushPublicKey(), env.SOLSTONE_VAPID_PUBLIC_KEY);
  assert.equal(push.webPushPublicKey().includes(env.SOLSTONE_VAPID_PRIVATE_KEY), false);
});

test("an incorrect VAPID private key fails closed", () => {
  const env = newKeys();
  const other = newKeys();
  env.SOLSTONE_VAPID_PRIVATE_KEY = other.SOLSTONE_VAPID_PRIVATE_KEY;
  assert.equal(loadWebPush(env).webPushPublicKey(), null);
});

test("missing or malformed VAPID contact fails closed", () => {
  for (const contact of ["", "mailto:", "mailto:invalid", "ftp://example.com", "https://user:pass@example.com"]) {
    const env = { ...newKeys(), SOLSTONE_VAPID_CONTACT: contact };
    assert.equal(loadWebPush(env).webPushPublicKey(), null, contact);
  }
});

test("push endpoint allow-list blocks SSRF, redirects and credentials", () => {
  const push = loadWebPush(newKeys());
  const valid = [
    "https://fcm.googleapis.com/fcm/send/test-token",
    "https://web.push.apple.com/QABCDEF",
    "https://updates.push.services.mozilla.com/wpush/v2/test",
  ];
  const invalid = [
    "http://fcm.googleapis.com/fcm/send/test",
    "https://fcm.googleapis.com.attacker.example/fcm/send/token",
    "https://user@fcm.googleapis.com/fcm/send/token",
    "https://fcm.googleapis.com:8443/fcm/send/token",
    "https://fcm.googleapis.com/fcm/send/token?redirect=http://localhost",
    "https://127.0.0.1/push",
    "https://localhost/push",
    "https://192.168.1.1/push",
    "file:///etc/passwd",
  ];
  for (const endpoint of valid) assert.equal(push.isTrustedPushEndpoint(endpoint), true, endpoint);
  for (const endpoint of invalid) assert.equal(push.isTrustedPushEndpoint(endpoint), false, endpoint);
});

test("VAPID authorization has a valid ES256 signature and scoped audience", () => {
  const env = newKeys();
  const push = loadWebPush(env);
  const endpoint = "https://web.push.apple.com/valid-sample";
  const header = push.__test.vapidAuthorization(endpoint);
  const match = header.match(/^vapid t=([^.]+)\.([^.]+)\.([^,\s]+), k=([^\s]+)$/);
  assert.ok(match, "must emit the RFC VAPID Authorization syntax");
  const [, encodedHeader, encodedClaims, sig, pub] = match;
  assert.equal(pub, env.SOLSTONE_VAPID_PUBLIC_KEY);
  const jwtHeader = JSON.parse(Buffer.from(encodedHeader, "base64url").toString());
  const claims = JSON.parse(Buffer.from(encodedClaims, "base64url").toString());
  assert.equal(jwtHeader.alg, "ES256");
  assert.equal(claims.aud, "https://web.push.apple.com");
  assert.equal(claims.sub, env.SOLSTONE_VAPID_CONTACT);
  assert.ok(claims.exp > Date.now()/1000);
  assert.ok(claims.exp < Date.now()/1000 + 24 * 60 * 60);

  const raw = Buffer.from(pub, "base64url");
  const publicKey = crypto.createPublicKey({
    key: {
      kty: "EC", crv: "P-256",
      x: raw.subarray(1, 33).toString("base64url"),
      y: raw.subarray(33, 65).toString("base64url"),
    },
    format: "jwk",
  });
  const valid = crypto.verify(
    "sha256",
    Buffer.from(encodedHeader + "." + encodedClaims),
    { key: publicKey, dsaEncoding: "ieee-p1363" },
    Buffer.from(sig, "base64url")
  );
  assert.ok(valid);
});

test("empty-payload push sends only to approved HTTPS provider and never follows redirects", async () => {
  const calls = [];
  const push = loadWebPush(newKeys(), async (endpoint, options) => {
    calls.push({endpoint, options});
    return {status: 201};
  });
  const denied = await push.__test.sendEmptyWebPush("https://attacker.example/collect");
  assert.equal(denied, 400);
  assert.equal(calls.length, 0);
  const endpoint = "https://fcm.googleapis.com/fcm/send/test-token";
  const status = await push.__test.sendEmptyWebPush(endpoint);
  assert.equal(status, 201);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].endpoint, endpoint);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(calls[0].options.headers.TTL, "120");
  assert.ok(calls[0].options.headers.Authorization.startsWith("vapid t="));
  assert.equal(calls[0].options.body, undefined, "no message body sent to push provider");
});
