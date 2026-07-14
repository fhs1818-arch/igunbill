"use server";

import { RepairCategory, RepairPayer, RoomStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backupDatabaseFile } from "@/lib/backup";
import { requireAdmin } from "@/lib/admin-auth";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/audit-log";
import { toDate, toDateString, toInt, toStringOrNull } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { rentPaymentStatus, syncRentPaymentsForRoom } from "@/lib/rent-sync";

function todayString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function revalidateRentalPages() {
  revalidatePath("/");
  revalidatePath("/rooms");
  revalidatePath("/payments");
  revalidatePath("/move");
}

export async function backupDatabase(formData: FormData) {
  await requireAdmin();
  await backupDatabaseFile().catch(() => null);
  await writeAuditLog({
    action: AUDIT_ACTIONS.BACKUP_DOWNLOAD,
    targetType: "Backup",
    description: "백업 다운로드를 실행했습니다."
  });

  const month = String(formData.get("month") ?? "").trim();
  const query = new URLSearchParams({ backup: "unsupported" });
  if (/^\d{4}-\d{2}$/.test(month)) {
    query.set("month", month);
  }

  redirect(`/?${query.toString()}`);
}

export async function createRoom(formData: FormData) {
  const room = await prisma.room.create({
    data: {
      roomNumber: String(formData.get("roomNumber") ?? "").trim(),
      tenantName: toStringOrNull(formData, "tenantName"),
      tenantPhone: toStringOrNull(formData, "tenantPhone"),
      deposit: toInt(formData, "deposit"),
      monthlyRent: toInt(formData, "monthlyRent"),
      rentDueDay: toInt(formData, "rentDueDay") || 5,
      moveInDate: toDateString(formData, "moveInDate"),
      moveOutDate: toDateString(formData, "moveOutDate"),
      status: formData.get("status") as RoomStatus,
      memo: toStringOrNull(formData, "memo")
    }
  });
  await syncRentPaymentsForRoom(room);
  await writeAuditLog({
    action: AUDIT_ACTIONS.ROOM_CREATE,
    targetType: "Room",
    targetId: room.id,
    description: `${room.roomNumber}호를 등록했습니다.`,
    metadata: {
      roomNumber: room.roomNumber,
      tenantName: room.tenantName,
      status: room.status
    }
  });
  revalidateRentalPages();
}

export async function updateRoom(formData: FormData) {
  const id = toInt(formData, "id");
  const before = await prisma.room.findUnique({ where: { id } });
  const room = await prisma.room.update({
    where: { id },
    data: {
      roomNumber: String(formData.get("roomNumber") ?? "").trim(),
      tenantName: toStringOrNull(formData, "tenantName"),
      tenantPhone: toStringOrNull(formData, "tenantPhone"),
      deposit: toInt(formData, "deposit"),
      monthlyRent: toInt(formData, "monthlyRent"),
      rentDueDay: toInt(formData, "rentDueDay") || 5,
      moveInDate: toDateString(formData, "moveInDate"),
      moveOutDate: toDateString(formData, "moveOutDate"),
      status: formData.get("status") as RoomStatus,
      memo: toStringOrNull(formData, "memo")
    }
  });
  await syncRentPaymentsForRoom(room);
  await writeAuditLog({
    action: AUDIT_ACTIONS.ROOM_UPDATE,
    targetType: "Room",
    targetId: room.id,
    description: `${room.roomNumber}호를 수정했습니다.`,
    metadata: {
      before,
      after: room
    }
  });
  revalidateRentalPages();
}

export async function deleteRoom(formData: FormData) {
  await requireAdmin();
  const id = toInt(formData, "id");
  const room = await prisma.room.findUnique({ where: { id } });
  await prisma.room.delete({ where: { id } });
  await writeAuditLog({
    action: AUDIT_ACTIONS.ROOM_DELETE,
    targetType: "Room",
    targetId: id,
    description: `${room?.roomNumber ?? id}호를 삭제했습니다.`,
    metadata: {
      deleted: room
    }
  });
  revalidateRentalPages();
}

export async function updatePayment(formData: FormData) {
  const id = toInt(formData, "id");
  const payment = await prisma.rentPayment.findUniqueOrThrow({
    where: { id },
    include: { room: true }
  });
  const paidDate = toDate(formData, "paidDate");

  await prisma.rentPayment.update({
    where: { id },
    data: {
      paidDate,
      status: rentPaymentStatus(payment.paymentMonth, payment.room.rentDueDay, paidDate),
      memo: toStringOrNull(formData, "memo")
    }
  });
  await writeAuditLog({
    action: AUDIT_ACTIONS.PAYMENT_UPDATE,
    targetType: "RentPayment",
    targetId: id,
    description: `${payment.room.roomNumber}호 ${payment.paymentMonth} 월세 납부내역을 수정했습니다.`,
    metadata: {
      paymentMonth: payment.paymentMonth,
      roomNumber: payment.room.roomNumber,
      paidDate
    }
  });
  revalidatePath("/payments");
  revalidatePath("/");
}

export async function markPaymentPaid(formData: FormData) {
  const id = toInt(formData, "id");
  const payment = await prisma.rentPayment.findUniqueOrThrow({
    where: { id },
    include: { room: true }
  });

  await prisma.rentPayment.update({
    where: { id },
    data: {
      paidDate: toDate(formData, "paidDate") ?? new Date(),
      status: "PAID"
    }
  });
  await writeAuditLog({
    action: AUDIT_ACTIONS.PAYMENT_MARK_PAID,
    targetType: "RentPayment",
    targetId: id,
    description: `${payment.room.roomNumber}호 ${payment.paymentMonth} 월세를 입금완료 처리했습니다.`,
    metadata: {
      paymentMonth: payment.paymentMonth,
      roomNumber: payment.room.roomNumber
    }
  });
  revalidatePath("/payments");
  revalidatePath("/");
}

export async function createRepair(formData: FormData) {
  const repair = await prisma.repair.create({
    data: {
      roomId: toInt(formData, "roomId"),
      date: toDate(formData, "date") ?? new Date(),
      category: formData.get("category") as RepairCategory,
      itemName: String(formData.get("itemName") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      amount: toInt(formData, "amount"),
      payer: formData.get("payer") as RepairPayer,
      isPaid: formData.get("isPaid") === "on",
      memo: toStringOrNull(formData, "memo")
    }
  });
  await writeAuditLog({
    action: AUDIT_ACTIONS.REPAIR_CREATE,
    targetType: "Repair",
    targetId: repair.id,
    description: `수리내역을 등록했습니다: ${repair.itemName}`,
    metadata: {
      roomId: repair.roomId,
      itemName: repair.itemName,
      amount: repair.amount
    }
  });
  revalidatePath("/repairs");
  revalidatePath("/");
}

export async function updateRepair(formData: FormData) {
  const id = toInt(formData, "id");
  const before = await prisma.repair.findUnique({ where: { id } });
  const repair = await prisma.repair.update({
    where: { id },
    data: {
      roomId: toInt(formData, "roomId"),
      date: toDate(formData, "date") ?? new Date(),
      category: formData.get("category") as RepairCategory,
      itemName: String(formData.get("itemName") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      amount: toInt(formData, "amount"),
      payer: formData.get("payer") as RepairPayer,
      isPaid: formData.get("isPaid") === "on",
      memo: toStringOrNull(formData, "memo")
    }
  });
  await writeAuditLog({
    action: AUDIT_ACTIONS.REPAIR_UPDATE,
    targetType: "Repair",
    targetId: repair.id,
    description: `수리내역을 수정했습니다: ${repair.itemName}`,
    metadata: {
      before,
      after: repair
    }
  });
  revalidatePath("/repairs");
  revalidatePath("/");
}

export async function deleteRepair(formData: FormData) {
  await requireAdmin();
  const id = toInt(formData, "id");
  const repair = await prisma.repair.findUnique({
    where: { id },
    include: { room: true }
  });
  await prisma.repair.delete({ where: { id } });
  await writeAuditLog({
    action: AUDIT_ACTIONS.REPAIR_DELETE,
    targetType: "Repair",
    targetId: id,
    description: `수리내역을 삭제했습니다: ${repair?.itemName ?? id}`,
    metadata: {
      deleted: repair
    }
  });
  revalidatePath("/repairs");
  revalidatePath("/");
}

export async function updateMoveOutDate(formData: FormData) {
  const room = await prisma.room.update({
    where: { id: toInt(formData, "roomId") },
    data: {
      moveOutDate: toDateString(formData, "moveOutDate"),
      memo: toStringOrNull(formData, "memo")
    }
  });
  await syncRentPaymentsForRoom(room);
  revalidateRentalPages();
}

export async function moveOut(formData: FormData) {
  const id = toInt(formData, "roomId");
  const before = await prisma.room.findUnique({ where: { id } });
  const room = await prisma.room.update({
    where: { id },
    data: {
      tenantName: null,
      tenantPhone: null,
      deposit: 0,
      monthlyRent: 0,
      moveInDate: null,
      moveOutDate: toDateString(formData, "moveOutDate") ?? todayString(),
      status: "VACANT",
      memo: toStringOrNull(formData, "memo")
    }
  });
  await syncRentPaymentsForRoom(room);
  await writeAuditLog({
    action: AUDIT_ACTIONS.ROOM_MOVE_OUT,
    targetType: "Room",
    targetId: room.id,
    description: `${before?.roomNumber ?? room.roomNumber}호를 퇴실 처리했습니다.`,
    metadata: {
      before,
      after: room
    }
  });
  revalidateRentalPages();
  redirect("/move");
}
