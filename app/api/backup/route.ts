import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin-auth";
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

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
