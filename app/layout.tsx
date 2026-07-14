import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "이건빌",
  description: "이건빌 임대관리"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
