import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.solstone.baustelle",
  appName: "Solstone Baustelle",
  webDir: "public",
  server: {
    url: "http://10.0.2.2:3000",
    cleartext: true
  }
};

export default config;