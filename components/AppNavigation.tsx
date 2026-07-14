"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  DatabaseBackup,
  DoorOpen,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Wallet,
  Wrench
} from "lucide-react";
import { RestoreBackupForm } from "@/components/RestoreBackupForm";
import { QuickRoomSearch } from "@/components/QuickRoomSearch";
import { PwaInstallButton } from "@/components/PwaInstallButton";

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
  { href: "/", label: "대시보드", Icon: LayoutDashboard },
  { href: "/rooms", label: "호실", Icon: DoorOpen },
  { href: "/payments", label: "월세", Icon: Wallet },
  { href: "/repairs", label: "수리", Icon: Wrench },
  { href: "/move", label: "퇴실", Icon: LogOut }
];

const menuIcons = {
  "/": LayoutDashboard,
  "/rooms": DoorOpen,
  "/payments": Wallet,
  "/repairs": Wrench,
  "/move": LogOut,
  "/tax": Receipt,
  "/audit-logs": History
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function AdminMenu() {
  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <ShieldCheck className="h-4 w-4" strokeWidth={2.1} />
        관리자 메뉴
      </p>
      <a className="button-primary flex w-full items-center gap-2" href="/api/backup">
        <DatabaseBackup className="h-4 w-4" strokeWidth={2.1} />
        백업 다운로드
      </a>
      <RestoreBackupForm icon={<RotateCcw className="h-4 w-4" strokeWidth={2.1} />} />
    </div>
  );
}

export function AppNavigation({ isAdmin, menus, signOutAction }: AppNavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <Image alt="이건빌" height={40} src="/brand/igunbill-app-icon.svg" width={40} />
            <div>
              <h1 className="text-xl font-bold text-ink">이건빌</h1>
              <p className="mt-0.5 text-xs font-bold text-slate-500">임대 수익을 한눈에</p>
            </div>
          </div>
        </div>
        <div className="border-b border-slate-200 p-3">
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
        <form action={signOutAction} className="border-t border-slate-200 p-3">
          <button className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 md:hover:bg-slate-50">
            로그아웃
          </button>
        </form>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <div className="flex items-center gap-2">
          <Image alt="이건빌" height={32} src="/brand/igunbill-app-icon.svg" width={32} />
          <div>
            <h1 className="text-lg font-bold leading-5 text-ink">이건빌</h1>
            <p className="text-[10px] font-bold text-slate-500">임대 수익을 한눈에</p>
          </div>
        </div>
        <button aria-label="메뉴 열기" className="px-3 py-2 active:scale-[0.98]" onClick={() => setIsOpen(true)} type="button">
          <Menu className="h-5 w-5" strokeWidth={2.1} />
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
          <aside className="absolute inset-y-0 right-0 flex w-[min(86vw,320px)] flex-col border-l border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <div className="flex items-center gap-2">
                <Image alt="이건빌" height={36} src="/brand/igunbill-app-icon.svg" width={36} />
                <div>
                  <h2 className="text-lg font-bold text-ink">이건빌</h2>
                  <p className="text-xs font-bold text-slate-500">임대 수익을 한눈에</p>
                </div>
              </div>
              <button aria-label="메뉴 닫기" onClick={() => setIsOpen(false)} type="button">
                닫기
              </button>
            </div>
            <div className="border-b border-slate-200 p-3">
              <QuickRoomSearch />
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {menus.map((menu) => {
                const Icon = menuIcons[menu.href as keyof typeof menuIcons] ?? LayoutDashboard;
                return (
                  <Link
                    key={menu.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold ${
                      isActive(pathname, menu.href) ? "bg-slate-100 text-ink" : "text-slate-700 hover:bg-slate-100"
                    }`}
                    href={menu.href}
                    onClick={() => setIsOpen(false)}
                  >
                      <Icon className="h-5 w-5" strokeWidth={2.1} />
                    {menu.label}
                  </Link>
                );
              })}
            </nav>
            {isAdmin ? (
              <div className="border-t border-slate-200 p-3">
                <AdminMenu />
              </div>
            ) : null}
            <div className="border-t border-slate-200 p-3">
              <PwaInstallButton />
            </div>
            <form action={signOutAction} className="border-t border-slate-200 p-3">
              <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 md:hover:bg-slate-50">
                <LogOut className="h-4 w-4" strokeWidth={2.1} />
                로그아웃
              </button>
            </form>
          </aside>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(64px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {bottomMenus.map(({ Icon, ...menu }) => (
          <Link
            key={menu.href}
            className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors duration-150 active:scale-[0.98] ${
              isActive(pathname, menu.href) ? "text-brand" : "text-slate-400"
            }`}
            href={menu.href}
          >
            <Icon className="h-[21px] w-[21px]" strokeWidth={2.1} />
            <span>{menu.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
