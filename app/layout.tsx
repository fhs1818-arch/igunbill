import type { Metadata, Viewport } from "next";
import { PwaSplashScreen } from "@/components/PwaSplashScreen";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "이건빌",
  description: "임대 수익을 한눈에",
  applicationName: "이건빌",
  appleWebApp: {
    capable: true,
    title: "이건빌",
    statusBarStyle: "default"
  },
  icons: {
    apple: "/icons/icon-192.png",
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  },
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#2563EB",
  colorScheme: "light"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ServiceWorkerRegister />
        <PwaSplashScreen />
        {children}
      </body>
    </html>
  );
}
