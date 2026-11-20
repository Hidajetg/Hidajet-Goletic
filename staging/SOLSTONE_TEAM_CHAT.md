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

These are alerts while the application is running. True Android FCM and iOS
APNs push notifications while closed, plus native audio/permission testing,
still require a separate implementation and authorized cloud credentials.

## Rollout gates
1. Apply staging schema to an isolated DB only, review all Storage policies.
2. Test anonymous/inactive/outsider and cross-private-room access denials.
3. Test images, PDF and iOS/Android voice recording on actual phones.
4. Set translation API key on server; test technical phrases all 5 languages.
5. Validate camera/media chooser, PDF exports, notifications and battery usage.
6. Fix existing weak legacy PIN security and unrelated production RLS issues.
7. Deploy to production only after testing; Google Play and App Store LAST.
