import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Build from mobile/: npm run build && npx cap sync android
 * Vite writes mobile/dist (not public). Keep bundled assets inside the APK.
 * Never use the Android emulator-only URL 10.0.2.2 in a release build.
 */
const config: CapacitorConfig = {
  appId: "com.solstone.baustelle",
  appName: "Solstone Baustelle",
  webDir: "dist",
  android: {
    backgroundColor: "#000000",
  },
  ios: {
    backgroundColor: "#000000",
    contentInset: "automatic",
  },
};

export default config;
