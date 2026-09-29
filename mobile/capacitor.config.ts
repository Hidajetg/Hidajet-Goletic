import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.solstone.baustelle",
  appName: "Solstone Baustelle",
  webDir: "dist",
  loggingBehavior: "debug",
  android: {
    backgroundColor: "#000000",
  },
  ios: {
    backgroundColor: "#000000",
    contentInset: "automatic",
  },
};

export default config;
