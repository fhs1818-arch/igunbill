import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  return prisma.adminUser.findUnique({
    where: {
      email: user.email
    }
  });
}

export async function requireAdmin() {
  const adminUser = await getCurrentAdminUser();

  if (!adminUser) {
    redirect("/unauthorized");
  }

  if (adminUser.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  return adminUser;
}
