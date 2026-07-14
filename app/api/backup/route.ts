import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

function todayFileStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function GET() {
  const adminUser = await getCurrentAdminUser();

  if (adminUser?.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const [rooms, rentPayments, repairs] = await Promise.all([
    prisma.room.findMany({ orderBy: { id: "asc" } }),
    prisma.rentPayment.findMany({ orderBy: { id: "asc" } }),
    prisma.repair.findMany({ orderBy: { id: "asc" } })
  ]);

  const backup = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    tables: {
      rooms,
      rentPayments,
      repairs
    }
  };

  const fileName = `igunbill-backup-${todayFileStamp()}.json`;
  await writeAuditLog({
    action: AUDIT_ACTIONS.BACKUP_DOWNLOAD,
    targetType: "Backup",
    description: "백업 JSON 파일을 다운로드했습니다.",
    metadata: {
      roomsCount: rooms.length,
      rentPaymentsCount: rentPayments.length,
      repairsCount: repairs.length
    }
  });

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
