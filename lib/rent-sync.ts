import { PaymentStatus, RentPayment, Room } from "@prisma/client";
import { monthKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type SyncRoom = Pick<Room, "id" | "status" | "monthlyRent" | "rentDueDay" | "moveInDate" | "moveOutDate">;

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function dueDateString(paymentMonth: string, rentDueDay: number) {
  const [year, month] = paymentMonth.split("-").map(Number);
  const day = Math.min(Math.max(rentDueDay || 1, 1), lastDayOfMonth(year, month));
  return `${paymentMonth}-${String(day).padStart(2, "0")}`;
}

function todayString() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function rentPaymentStatus(paymentMonth: string, rentDueDay: number, paidDate?: Date | null): PaymentStatus {
  if (paidDate) return "PAID";
  return todayString() > dueDateString(paymentMonth, rentDueDay) ? "OVERDUE" : "SCHEDULED";
}

function monthRange(startMonth: string, endMonth: string) {
  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
  const months: string[] = [];
  const cursor = new Date(startYear, startMonthNumber - 1, 1);
  const end = new Date(endYear, endMonthNumber - 1, 1);

  while (cursor <= end) {
    months.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function monthlyRentFor(room: SyncRoom, existing: RentPayment | null) {
  return existing?.status === "PAID" ? existing.monthlyRent : room.monthlyRent;
}

export async function syncRentPaymentsForRoom(room: SyncRoom) {
  const currentMonth = monthKey();
  const moveOutMonth = room.moveOutDate?.slice(0, 7) ?? null;

  if (room.status !== "OCCUPIED" || !room.moveInDate || room.monthlyRent <= 0) {
    await prisma.rentPayment.deleteMany({
      where: {
        roomId: room.id,
        status: { not: "PAID" },
        paymentMonth: { gt: currentMonth }
      }
    });
    return;
  }

  const startMonth = room.moveInDate.slice(0, 7);
  const endMonth = moveOutMonth && moveOutMonth < currentMonth ? moveOutMonth : currentMonth;

  if (endMonth < startMonth) return;

  for (const paymentMonth of monthRange(startMonth, endMonth)) {
    const existing = await prisma.rentPayment.findUnique({
      where: {
        roomId_paymentMonth: {
          roomId: room.id,
          paymentMonth
        }
      }
    });
    const monthlyRent = monthlyRentFor(room, existing);
    const status = rentPaymentStatus(paymentMonth, room.rentDueDay, existing?.paidDate);

    await prisma.rentPayment.upsert({
      where: {
        roomId_paymentMonth: {
          roomId: room.id,
          paymentMonth
        }
      },
      create: {
        roomId: room.id,
        paymentMonth,
        monthlyRent,
        status
      },
      update: {
        monthlyRent,
        status
      }
    });
  }

  await prisma.rentPayment.deleteMany({
    where: {
      roomId: room.id,
      status: { not: "PAID" },
      paymentMonth: { gt: endMonth }
    }
  });
}

export async function syncRentPaymentsForAllRooms() {
  const rooms = await prisma.room.findMany();
  for (const room of rooms) {
    await syncRentPaymentsForRoom(room);
  }
}
