import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NotificationSound from "./components/NotificationSound";
import NativePushSync from "./components/NativePushSync";
import TeamChatWidget from "./components/TeamChatWidget";
import TeamChatAlerts from "./components/TeamChatAlerts";
import SolstoneAIEntry from "./components/SolstoneAIEntry";
import NativeBackGuard from "./components/NativeBackGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Baustelle App",
  description: "Evidencija sati, materijala i prostorija",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-512.png",
    apple: "/icon-512.png",
  },
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
        <TeamChatWidget />
        <TeamChatAlerts />
        <SolstoneAIEntry />
        {children}
        <NativeBackGuard />
      </body>
    </html>
  );
}