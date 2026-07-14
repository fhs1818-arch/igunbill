import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "이건빌",
  description: "이건빌 임대관리",
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
  themeColor: "#1f6feb",
  colorScheme: "light"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
