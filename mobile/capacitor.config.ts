import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Solstone's real Next.js app must run on its HTTPS production host:
 * its API routes, cookie-based PIN login, PDFs and server-side features
 * cannot be exported as a static Vite bundle.
 *
 * Set SOLSTONE_WEB_URL (without a path/query/fragment) to the verified,
 * public production HTTPS origin when building an INTERNAL test APK.
 * Without this variable, Capacitor continues to bundle the incomplete
 * standalone mobile prototype from dist.
 */
const urlText = process.env.SOLSTONE_WEB_URL?.trim();
let server: CapacitorConfig["server"] | undefined;

if (urlText) {
  const url = new URL(urlText);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".local")
  ) {
    throw new Error("SOLSTONE_WEB_URL must be a public HTTPS origin.");
  }
  server = {
    url: url.origin,
    cleartext: false,
  };
}

const config: CapacitorConfig = {
  appId: "com.solstone.baustelle",
  appName: "Solstone Baustelle",
  webDir: "dist",
  ...(server ? { server } : {}),
  android: {
    backgroundColor: "#000000",
  },
  ios: {
    backgroundColor: "#000000",
    contentInset: "automatic",
  },
};

export default config;
