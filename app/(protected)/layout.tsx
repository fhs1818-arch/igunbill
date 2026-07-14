import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { AdminRoleProvider } from "@/components/AdminRoleProvider";
import { QuickRoomSearch } from "@/components/QuickRoomSearch";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const baseMenus = [
  { href: "/", label: "대시보드" },
  { href: "/rooms", label: "호실관리" },
  { href: "/payments", label: "월세입금관리" },
  { href: "/repairs", label: "수리관리" },
  { href: "/move", label: "퇴실관리" }
];

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const adminUser = await prisma.adminUser.findUnique({
    where: {
      email: user.email
    }
  });

  if (!adminUser) {
    redirect("/unauthorized");
  }
  const menus =
    adminUser.role === "ADMIN"
      ? [...baseMenus, { href: "/audit-logs", label: "활동 로그" }]
      : baseMenus;

  return (
    <AdminRoleProvider role={adminUser.role}>
      <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
        <aside className="flex w-full flex-col border-b border-line bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r">
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
                className="block rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                href={menu.href}
              >
                {menu.label}
              </Link>
            ))}
          </nav>
          <form action={signOut} className="border-t border-line p-3">
            <button className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              로그아웃
            </button>
          </form>
        </aside>
        <main className="flex-1 lg:ml-64">{children}</main>
      </div>
    </AdminRoleProvider>
  );
}
