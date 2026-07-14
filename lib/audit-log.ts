import type { Prisma } from "@prisma/client";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const AUDIT_ACTIONS = {
  ROOM_CREATE: "ROOM_CREATE",
  ROOM_UPDATE: "ROOM_UPDATE",
  ROOM_DELETE: "ROOM_DELETE",
  PAYMENT_UPDATE: "PAYMENT_UPDATE",
  PAYMENT_MARK_PAID: "PAYMENT_MARK_PAID",
  REPAIR_CREATE: "REPAIR_CREATE",
  REPAIR_UPDATE: "REPAIR_UPDATE",
  REPAIR_DELETE: "REPAIR_DELETE",
  ROOM_MOVE_OUT: "ROOM_MOVE_OUT",
  BACKUP_DOWNLOAD: "BACKUP_DOWNLOAD",
  BACKUP_RESTORE: "BACKUP_RESTORE"
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

type AuditLogInput = {
  action: AuditAction;
  targetType: string;
  targetId?: string | number | null;
  description: string;
  metadata?: Prisma.InputJsonValue;
};

export async function writeAuditLog(input: AuditLogInput) {
  try {
    const adminUser = await getCurrentAdminUser();

    if (!adminUser) return;

    await prisma.auditLog.create({
      data: {
        userEmail: adminUser.email,
        userRole: adminUser.role,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId == null ? null : String(input.targetId),
        description: input.description,
        metadata: input.metadata
      }
    });
  } catch (error) {
    console.error("AuditLog 저장 실패", error);
  }
}
