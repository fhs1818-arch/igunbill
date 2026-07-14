import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { AdminRoleProvider } from "@/components/AdminRoleProvider";
import { AppNavigation } from "@/components/AppNavigation";
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

  const isAdmin = adminUser.role === "ADMIN";
  const menus = isAdmin
    ? [...baseMenus, { href: "/tax", label: "세무" }, { href: "/audit-logs", label: "활동 로그" }]
    : baseMenus;

  return (
    <AdminRoleProvider role={adminUser.role}>
      <div className="min-h-screen bg-surface">
        <AppNavigation isAdmin={isAdmin} menus={menus} signOutAction={signOut} />
        <main className="min-h-screen pb-20 pt-14 md:ml-[260px] md:pb-0 md:pt-0">{children}</main>
      </div>
    </AdminRoleProvider>
  );
}
