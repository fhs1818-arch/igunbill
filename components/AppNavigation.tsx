"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { RestoreBackupForm } from "@/components/RestoreBackupForm";
import { QuickRoomSearch } from "@/components/QuickRoomSearch";

type MenuItem = {
  href: string;
  label: string;
};

type AppNavigationProps = {
  isAdmin: boolean;
  menus: MenuItem[];
  signOutAction: () => Promise<void>;
};

const bottomMenus = [
  { href: "/", label: "대시보드" },
  { href: "/rooms", label: "호실" },
  { href: "/payments", label: "월세" },
  { href: "/repairs", label: "수리" }
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function AdminMenu() {
  return (
    <div className="grid gap-2 rounded-md border border-line bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">관리자 메뉴</p>
      <a className="button-primary w-full" href="/api/backup">
        백업 다운로드
      </a>
      <RestoreBackupForm />
    </div>
  );
}

export function AppNavigation({ isAdmin, menus, signOutAction }: AppNavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-white md:flex">
        <div className="border-b border-line px-6 py-5">
          <p className="text-xs font-semibold text-slate-500">RENTAL MANAGER</p>
          <h1 className="mt-1 text-xl font-bold text-ink">이건빌</h1>
        </div>
        <div className="border-b border-line p-3">
          <QuickRoomSearch />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {menus.map((menu) => (
            <Link
              key={menu.href}
              className={`block rounded-md px-3 py-2.5 text-sm font-semibold ${
                isActive(pathname, menu.href) ? "bg-slate-100 text-ink" : "text-slate-700 hover:bg-slate-100"
              }`}
              href={menu.href}
            >
              {menu.label}
            </Link>
          ))}
        </nav>
        {isAdmin ? (
          <div className="border-t border-line p-3">
            <AdminMenu />
          </div>
        ) : null}
        <form action={signOutAction} className="border-t border-line p-3">
          <button className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            로그아웃
          </button>
        </form>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-white px-4 md:hidden">
        <div>
          <p className="text-[10px] font-semibold text-slate-500">RENTAL MANAGER</p>
          <h1 className="text-lg font-bold text-ink">이건빌</h1>
        </div>
        <button aria-label="메뉴 열기" className="px-3 py-2" onClick={() => setIsOpen(true)} type="button">
          메뉴
        </button>
      </header>

      {isOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="메뉴 닫기"
            className="absolute inset-0 h-full w-full cursor-default border-0 bg-slate-900/30 p-0 hover:bg-slate-900/30"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(86vw,320px)] flex-col border-l border-line bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-4">
              <div>
                <p className="text-xs font-semibold text-slate-500">MENU</p>
                <h2 className="text-lg font-bold text-ink">이건빌</h2>
              </div>
              <button aria-label="메뉴 닫기" onClick={() => setIsOpen(false)} type="button">
                닫기
              </button>
            </div>
            <div className="border-b border-line p-3">
              <QuickRoomSearch />
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {menus.map((menu) => (
                <Link
                  key={menu.href}
                  className={`block rounded-md px-3 py-3 text-sm font-semibold ${
                    isActive(pathname, menu.href) ? "bg-slate-100 text-ink" : "text-slate-700 hover:bg-slate-100"
                  }`}
                  href={menu.href}
                  onClick={() => setIsOpen(false)}
                >
                  {menu.label}
                </Link>
              ))}
            </nav>
            {isAdmin ? (
              <div className="border-t border-line p-3">
                <AdminMenu />
              </div>
            ) : null}
            <form action={signOutAction} className="border-t border-line p-3">
              <button className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                로그아웃
              </button>
            </form>
          </aside>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-line bg-white md:hidden">
        {bottomMenus.map((menu) => (
          <Link
            key={menu.href}
            className={`flex flex-col items-center justify-center text-xs font-semibold ${
              isActive(pathname, menu.href) ? "text-brand" : "text-slate-500"
            }`}
            href={menu.href}
          >
            <span className="text-[11px]">{menu.label}</span>
          </Link>
        ))}
        <button
          className={`flex flex-col items-center justify-center rounded-none border-0 bg-white text-xs font-semibold ${
            isOpen ? "text-brand" : "text-slate-500"
          }`}
          onClick={() => setIsOpen(true)}
          type="button"
        >
          메뉴
        </button>
      </nav>
    </>
  );
}
