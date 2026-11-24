import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NotificationSound from "./components/NotificationSound";
import NativePushSync from "./components/NativePushSync";
import TeamChatAlerts from "./components/TeamChatAlerts";
import TeamChatWidget from "./components/TeamChatWidget";
import SolstoneAIEntry from "./components/SolstoneAIEntry";
import SolstoneMobileNav from "./components/SolstoneMobileNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solstone Baustelle",
  description: "Solstone Baustelle – raspored, gradilišta, radni sati i tim",
  applicationName: "Solstone Baustelle",
  appleWebApp: { capable: true, title: "Solstone", statusBarStyle: "black-translucent" },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-512.png",
    apple: "/icon-512.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#151f2b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NotificationSound />
        <NativePushSync />
        <TeamChatAlerts />
        <TeamChatWidget />
        <SolstoneAIEntry />
        <SolstoneMobileNav />
        {children}
      </body>
    </html>
  );
}