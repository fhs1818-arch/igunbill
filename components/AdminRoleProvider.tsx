"use client";

import type { UserRole } from "@prisma/client";
import { createContext, useContext } from "react";

const AdminRoleContext = createContext<UserRole | null>(null);

export function AdminRoleProvider({
  children,
  role
}: {
  children: React.ReactNode;
  role: UserRole;
}) {
  return <AdminRoleContext.Provider value={role}>{children}</AdminRoleContext.Provider>;
}

export function useAdminRole() {
  return useContext(AdminRoleContext);
}
