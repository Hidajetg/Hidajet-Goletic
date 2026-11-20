# Solstone Baustelle — mobile (Android / iOS)

This directory is a **separate Vite/React + Capacitor application**, not a packaged copy of the Next.js web app. At present, some dashboard actions are placeholders. Do not distribute it as the full production app.

## Android debug build (Windows)

Prerequisites: Node.js compatible with the installed Vite version, Android Studio, Android SDK and JDK.

1. In PowerShell, open the repository's `mobile` directory.
2. Create `mobile/.env.local` **locally only** with these *public-client* settings, configured by your administrator:
   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_LEGACY_ANON_KEY
   ```
   Never put a Supabase service-role/secret key in any Vite variable or Android package. Never commit .env files.
3. Run:
   ```powershell
   npm ci
   npm run build
   npx cap sync android
   npx cap open android
   ```
4. In Android Studio, run on a test device (or build a debug APK).

**Why the old build could appear blank:** the previous `mobile/capacitor.config.ts` used `webDir: "public"` and `server.url: "http://10.0.2.2:3000"`. This emulator address is not reachable from a normal phone. We now bundle Vite's `dist` output and omit `server.url`.

After **every** web-code change, rerun `npm run build` and `npx cap sync android` before rebuilding. `npm run dev` alone does **not** refresh the installed app.

## Important before production release

- The current mobile UI authenticates through Supabase Auth email/password, while the Next.js web app also contains a separate PIN/cookie login flow. Align the user model securely before releasing.
- Audit the `workers` and `baustellen` access policies (RLS), including role visibility and deactivated users. The UI alone is not a security boundary.
- Confirm the Android signing keystore/backups and existing Google Play application ID before creating a release bundle.
- Review the web application's server-only API routes, PDFs, file uploads, camera, notifications, and offline/error handling. Not all Next.js behavior is present in this Vite app.
- iOS builds require Xcode on macOS or a supported macOS cloud build workflow, an Apple Developer account for distribution, and iOS project setup.

This branch is for testing only. The main branch and live web application are unchanged.
