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

## Internal test: the SAME hosted Next.js web app and PIN login

Use the separate GitHub Actions workflow `.github/workflows/android-web-test.yml`.
This **internal-test-only** APK sets `SOLSTONE_WEB_URL` to the candidate
production Vercel domain `https://hidajet-goletic-frno.vercel.app`.
The URL has NOT been confirmed by the owner as the workers' actual production
URL. A Vercel authentication or access restriction can prevent it from loading.

This mode displays the actual remote website, so it uses the web app's current
worker-name/PIN login, API routes and UI rather than the incomplete standalone
Vite screen with separate email/password login. It requires internet and may
behave differently for file uploads, downloads, the camera and navigation.
Check these on real Android devices with worker and admin accounts before
offering it to employees.

**Do not distribute this remote-web-mode APK through Google Play or the
App Store.** Capacitor documents `server.url` for live reload/testing, not
a production release. A store-ready native experience needs a separate
release architecture, app review and iOS signing/testing.

For Android launcher icons, the CI workflow generates PNG resources from
`mobile/branding/solstone-approved-icon.webp.b64` using
`mobile/scripts/generate_mobile_icons.py`. It is a reduced-size
representation of the approved artwork. The original 1024px master asset
should be used for store-release icons.

The current web app and `main` branch are unaffected by this internal test.
GitHub branch `web-backup-2026-11-20` is a snapshot of the *older GitHub web
code*, not a backup of uncommitted local Windows files or the live database.

### Security gate before release

The older web repository includes legacy login credentials in source code.
Do not publish that login approach or consider it secure without rotating
legacy PINs, removing hardcoded secrets, and validating server-side role
authorization and Supabase RLS. This is separate from the mobile build.
