"use server";

import { RepairCategory, RepairPayer, RoomStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { backupDatabaseFile } from "@/lib/backup";
import { requireAdmin } from "@/lib/admin-auth";
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
  revalidateRentalPages();
}

export async function updateRoom(formData: FormData) {
  const room = await prisma.room.update({
    where: { id: toInt(formData, "id") },
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
  revalidateRentalPages();
}

export async function deleteRoom(formData: FormData) {
  await requireAdmin();
  await prisma.room.delete({ where: { id: toInt(formData, "id") } });
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
  revalidatePath("/payments");
  revalidatePath("/");
}

export async function createRepair(formData: FormData) {
  await prisma.repair.create({
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
  revalidatePath("/repairs");
  revalidatePath("/");
}

export async function updateRepair(formData: FormData) {
  await prisma.repair.update({
    where: { id: toInt(formData, "id") },
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
  revalidatePath("/repairs");
  revalidatePath("/");
}

export async function deleteRepair(formData: FormData) {
  await requireAdmin();
  await prisma.repair.delete({ where: { id: toInt(formData, "id") } });
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
  const room = await prisma.room.update({
    where: { id: toInt(formData, "roomId") },
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
  revalidateRentalPages();
  redirect("/move");
}
