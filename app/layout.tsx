import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "이건빌",
  description: "이건빌 임대관리"
};

const menus = [
  { href: "/", label: "대시보드" },
  { href: "/rooms", label: "호실관리" },
  { href: "/payments", label: "월세입금관리" },
  { href: "/repairs", label: "수리관리" },
  { href: "/move", label: "퇴실관리" }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="flex min-h-screen bg-surface">
          <aside className="fixed inset-y-0 left-0 w-64 border-r border-line bg-white">
            <div className="border-b border-line px-6 py-5">
              <p className="text-xs font-semibold text-slate-500">RENTAL MANAGER</p>
              <h1 className="mt-1 text-xl font-bold text-ink">이건빌</h1>
            </div>
            <nav className="space-y-1 p-3">
              {menus.map((menu) => (
                <Link
                  key={menu.href}
                  className="block rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  href={menu.href}
                >
                  {menu.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="ml-64 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
