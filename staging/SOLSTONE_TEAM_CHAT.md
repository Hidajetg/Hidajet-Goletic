# Solstone Team Chat — STAGING ONLY (2026-11-20)

The Team Chat code is on branch mobile-android-ios-test-2026-11-20 only.
Do not merge or deploy it to the workers' production web app yet.
Existing production Supabase schema, RLS, data, storage and production
Vercel deployment were not modified when authoring this feature.

## Database and authorization
Schema: staging/solstone-team-chat-schema.sql. Apply it only to an
isolated and approved Supabase development branch, with sample worker/site
and work-calendar data. A fresh Supabase branch does not automatically
copy production table rows.

Every Chat API route validates the signed solstone_session PIN cookie
AND re-reads the active worker and role from the database. Browser-provided
worker IDs or localStorage admin roles are never used for authorization.
Private chats are participant-only (admins cannot inspect unrelated private
messages). Announcements are admin-write and active-user-read.
Baustelle groups are admin-accessible or worker-accessible for exact
work_calendar assignments on today's Europe/Vienna date. Failing to match
the schedule denies access, even if a worker previously worked on a site.

New chat tables have RLS enabled and no anon/authenticated Data API access;
only verified server routes may use the server-side service-role key.
The chat does not repair vulnerabilities in existing legacy public tables.

## Pictures, PDFs and voice recordings
The new solstone-team-chat Storage bucket is private and restricts MIME
types and size to 20 MB. The API signs one random upload path after
authorizing a worker and conversation. Upload occurs directly to Storage
with a short-lived token, not a service-role credential. Sending the
message additionally requires checking the uploaded file's existence,
size and content type and an unexpired pending-upload record.
Read permission is checked again per attachment, then a 60-second
signed download URL is returned. Scan PDFs for malicious content and
verify MIME signatures before broad organizational rollout.

## Translation
Server-only OpenAI Responses calls translate authorized message text to
DE, BA, UZ, CZ and EN with a translation cache. Original text remains
available. Set SOLSTONE_CHAT_TRANSLATION_API_KEY or OPENAI_API_KEY only on
the isolated test server; no key means show original text without translation.
Before enabling automatic translation for real employees, review notices,
consent/legal basis and third-party data processing. Uploaded voice recordings,
PDF content and images are not transcribed or translated yet.

## In-app alerts
TeamChatAlerts polls only authorized room summaries, shows unread badges,
plays the existing Solstone notification sound (after user gesture) and can
speak a short incoming-sender alert in the selected app language. Spoken
alerts are OFF by default for privacy. Users can toggle sound, spoken alerts
and auto-translate individually on the Team Chat page.

## Web Push for installed iPhone PWA and Android browsers (2026-11-21)
A test-only payload-free Web Push implementation has been added. Source:
- public/solstone-push-sw.js: service worker does not cache message content.
- app/api/team-chat/push/route.ts: signed-session opt-in/opt-out.
- app/lib/web-push.ts: strict provider endpoint allow-list and VAPID-signed no-payload notifications.
- staging/solstone-chat-push-schema.sql: separate RLS/restricted table.
- app/team-chat/page.tsx: notification permission toggle.

Required server-only environment variables:
- SOLSTONE_VAPID_PUBLIC_KEY: base64url uncompressed P-256 (65-byte) public key
- SOLSTONE_VAPID_PRIVATE_KEY: base64url P-256 (32-byte) private key
- SOLSTONE_VAPID_CONTACT: valid mailto: or https: contact (public VAPID identity)

Generate a P-256 VAPID keypair securely, save privately in the test deployment's
environment. Keep private keys out of repository commits and browser bundles.
Do not rotate the keypair between app upgrades unless users resubscribe.
The API fails closed if these variables or the table are not configured.
Use only a separate test Supabase DB until production release is approved.

After a push arrives, the service worker checks the signed cookie and requests
the authorized room summary; actual message bodies are NOT sent to Apple,
Google or Mozilla push services. Only sender/room summary may appear in the
visible notification. On iPhone this requires iOS 16.4+ and an installed
Home Screen web app with Notifications permitted. Android browser PWAs can use
Web Push where supported; Android native APK WebView does NOT support the
same PushManager and still requires separate Firebase/native setup.

The code is compiled and the isolated PostgreSQL schema tests pass; actual
end-to-end locked-phone delivery still requires test VAPID credentials and
real device validation. An experimental 1:1 voice calling feature is now in the staging branch:
- staging/solstone-call-schema.sql: restricted calls/signals and active participant heartbeats.
- app/api/team-calls and /signal: role/membership checks, call states, SDP/ICE polling.
- app/components/SolstoneCalls.tsx: accept/decline/hang-up, microphone, WebRTC audio.
- app/team-chat/page.tsx: phone button in private chats, workers can call each other or admins.
- Service worker checks incoming calls and displays a push notification when
  PWA Web Push is configured and the user is authenticated.

The experimental voice call feature is disabled by default. Both
SOLSTONE_CALLS_ENABLED=true (server-only) and
NEXT_PUBLIC_SOLSTONE_CALLS_ENABLED=true (preview frontend build) must be
configured in a private test environment before the call button/receiver and
endpoints are enabled. Do not enable either setting in production before
database migration, authorization tests, TURN and real-phone tests.

This is a prototype, NOT yet a released or verified calling service. Both
participants must be running compatible browsers and allow microphone access.
The public Google STUN endpoint is a connectivity aid, not a TURN relay.
Calls may fail on mobile networks until a reliable TURN server is configured;
that may introduce hosting/bandwidth costs. iPhone Home Screen Web Push can
alert the user but does not provide guaranteed native CallKit/full-screen ringing
when closed. Android native APK push still needs separate FCM integration.
No phone minutes are charged, but internet/server costs may apply.

## Authentication change (staging only)
Legacy hard-coded PIN shortcuts were removed from the test login endpoint.
All users/admins now need a worker_auth bcrypt hash. Read-only checks on
2026-11-21 showed 8 active worker records but only 7 matching auth records.
Provision the missing admin PIN securely through the existing authorized
admin flow before production release. Rotate any old source-code PINs;
do not copy PINs or password hashes into test reports. This change was not
deployed to workers' production application.

## Rollout gates
1. Apply staging schema to an isolated DB only, review all Storage policies.
2. Test anonymous/inactive/outsider and cross-private-room access denials.
3. Test images, PDF and iOS/Android voice recording on actual phones.
4. Set translation API key on server; test technical phrases all 5 languages.
5. Validate camera/media chooser, PDF exports, notifications and battery usage.
6. Verify every worker has a hashed PIN, retire old known PINs, and audit legacy production RLS.
7. Configure VAPID in a separate preview environment, test locked iPhone Home Screen notifications and Android browser alerts.
8. Implement/test Android APK FCM separately. Test call API access controls,
   signaling/ringing, dropped-network cleanup, and TURN relay on real phones.
9. Deploy to production only after testing; Google Play and App Store LAST.
