import { NextResponse } from "next/server";
import {
  PaymentStatus,
  RepairCategory,
  RepairPayer,
  RoomStatus,
  type Prisma
} from "@prisma/client";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const VALID_ROOM_STATUSES = new Set<string>(Object.values(RoomStatus));
const VALID_PAYMENT_STATUSES = new Set<string>(Object.values(PaymentStatus));
const VALID_REPAIR_CATEGORIES = new Set<string>(Object.values(RepairCategory));
const VALID_REPAIR_PAYERS = new Set<string>(Object.values(RepairPayer));

type BackupObject = {
  schemaVersion: 1;
  exportedAt: string;
  tables: {
    rooms: unknown[];
    rentPayments: unknown[];
    repairs: unknown[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isValidDateValue(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function optionalDate(value: unknown) {
  return value === null ? null : new Date(value as string);
}

function assertBackupShape(value: unknown): asserts value is BackupObject {
  if (!isRecord(value)) throw new Error("백업 파일 형식이 올바르지 않습니다.");
  if (value.schemaVersion !== 1) throw new Error("지원하지 않는 백업 버전입니다.");
  if (!isValidDateValue(value.exportedAt)) throw new Error("백업 생성일 형식이 올바르지 않습니다.");
  if (!isRecord(value.tables)) throw new Error("백업 테이블 정보가 없습니다.");
  if (!Array.isArray(value.tables.rooms)) throw new Error("rooms 데이터가 없습니다.");
  if (!Array.isArray(value.tables.rentPayments)) throw new Error("rentPayments 데이터가 없습니다.");
  if (!Array.isArray(value.tables.repairs)) throw new Error("repairs 데이터가 없습니다.");
}

function parseRooms(rows: unknown[]): Prisma.RoomCreateManyInput[] {
  const roomNumbers = new Set<string>();

  return rows.map((row) => {
    if (!isRecord(row)) throw new Error("Room 데이터 형식이 올바르지 않습니다.");

    const {
      id,
      roomNumber,
      tenantName,
      tenantPhone,
      status,
      deposit,
      monthlyRent,
      rentDueDay,
      moveInDate,
      moveOutDate,
      memo,
      createdAt,
      updatedAt
    } = row;

    if (!isInteger(id)) throw new Error("Room id가 올바르지 않습니다.");
    if (typeof roomNumber !== "string" || !roomNumber.trim()) throw new Error("Room roomNumber가 올바르지 않습니다.");
    if (roomNumbers.has(roomNumber)) throw new Error(`중복 호실번호가 있습니다: ${roomNumber}`);
    if (!VALID_ROOM_STATUSES.has(String(status))) throw new Error("Room status가 올바르지 않습니다.");
    if (!isInteger(deposit) || !isInteger(monthlyRent) || !isInteger(rentDueDay)) {
      throw new Error("Room 금액 또는 납부일 값이 올바르지 않습니다.");
    }
    if (!isStringOrNull(tenantName) || !isStringOrNull(tenantPhone) || !isStringOrNull(moveInDate) || !isStringOrNull(moveOutDate) || !isStringOrNull(memo)) {
      throw new Error("Room 문자열 필드가 올바르지 않습니다.");
    }
    if (!isValidDateValue(createdAt) || !isValidDateValue(updatedAt)) {
      throw new Error("Room 날짜 필드가 올바르지 않습니다.");
    }

    roomNumbers.add(roomNumber);

    return {
      id,
      roomNumber,
      tenantName,
      tenantPhone,
      status: status as RoomStatus,
      deposit,
      monthlyRent,
      rentDueDay,
      moveInDate,
      moveOutDate,
      memo,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt)
    };
  });
}

function parseRentPayments(rows: unknown[], roomIds: Set<number>): Prisma.RentPaymentCreateManyInput[] {
  const uniqueKeys = new Set<string>();

  return rows.map((row) => {
    if (!isRecord(row)) throw new Error("RentPayment 데이터 형식이 올바르지 않습니다.");

    const { id, roomId, paymentMonth, monthlyRent, paidDate, status, memo, createdAt, updatedAt } = row;

    if (!isInteger(id) || !isInteger(roomId)) throw new Error("RentPayment id가 올바르지 않습니다.");
    if (!roomIds.has(roomId)) throw new Error("RentPayment의 roomId가 Room 데이터에 없습니다.");
    if (typeof paymentMonth !== "string" || !/^\d{4}-\d{2}$/.test(paymentMonth)) {
      throw new Error("RentPayment paymentMonth가 올바르지 않습니다.");
    }
    if (!isInteger(monthlyRent)) throw new Error("RentPayment monthlyRent가 올바르지 않습니다.");
    if (paidDate !== null && !isValidDateValue(paidDate)) throw new Error("RentPayment paidDate가 올바르지 않습니다.");
    if (!VALID_PAYMENT_STATUSES.has(String(status))) throw new Error("RentPayment status가 올바르지 않습니다.");
    if (!isStringOrNull(memo)) throw new Error("RentPayment memo가 올바르지 않습니다.");
    if (!isValidDateValue(createdAt) || !isValidDateValue(updatedAt)) {
      throw new Error("RentPayment 날짜 필드가 올바르지 않습니다.");
    }

    const uniqueKey = `${roomId}:${paymentMonth}`;
    if (uniqueKeys.has(uniqueKey)) {
      throw new Error(`중복 월세 납부내역이 있습니다: roomId=${roomId}, paymentMonth=${paymentMonth}`);
    }
    uniqueKeys.add(uniqueKey);

    return {
      id,
      roomId,
      paymentMonth,
      monthlyRent,
      paidDate: optionalDate(paidDate),
      status: status as PaymentStatus,
      memo,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt)
    };
  });
}

function parseRepairs(rows: unknown[], roomIds: Set<number>): Prisma.RepairCreateManyInput[] {
  return rows.map((row) => {
    if (!isRecord(row)) throw new Error("Repair 데이터 형식이 올바르지 않습니다.");

    const {
      id,
      roomId,
      date,
      category,
      itemName,
      description,
      amount,
      payer,
      isPaid,
      memo,
      createdAt,
      updatedAt
    } = row;

    if (!isInteger(id) || !isInteger(roomId)) throw new Error("Repair id가 올바르지 않습니다.");
    if (!roomIds.has(roomId)) throw new Error("Repair의 roomId가 Room 데이터에 없습니다.");
    if (!isValidDateValue(date)) throw new Error("Repair date가 올바르지 않습니다.");
    if (!VALID_REPAIR_CATEGORIES.has(String(category))) throw new Error("Repair category가 올바르지 않습니다.");
    if (typeof itemName !== "string" || typeof description !== "string") throw new Error("Repair 항목명 또는 내용이 올바르지 않습니다.");
    if (!isInteger(amount)) throw new Error("Repair amount가 올바르지 않습니다.");
    if (!VALID_REPAIR_PAYERS.has(String(payer))) throw new Error("Repair payer가 올바르지 않습니다.");
    if (typeof isPaid !== "boolean") throw new Error("Repair isPaid가 올바르지 않습니다.");
    if (!isStringOrNull(memo)) throw new Error("Repair memo가 올바르지 않습니다.");
    if (!isValidDateValue(createdAt) || !isValidDateValue(updatedAt)) {
      throw new Error("Repair 날짜 필드가 올바르지 않습니다.");
    }

    return {
      id,
      roomId,
      date: new Date(date),
      category: category as RepairCategory,
      itemName,
      description,
      amount,
      payer: payer as RepairPayer,
      isPaid,
      memo,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt)
    };
  });
}

async function resetSequence(tx: Prisma.TransactionClient, tableName: string) {
  await tx.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"${tableName}"', 'id'),
      COALESCE((SELECT MAX("id") FROM "${tableName}"), 1),
      (SELECT MAX("id") FROM "${tableName}") IS NOT NULL
    )
  `);
}

export async function POST(request: Request) {
  const adminUser = await getCurrentAdminUser();

  if (adminUser?.role !== "ADMIN") {
    return NextResponse.json({ message: "접근 권한이 없습니다." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "복원할 JSON 파일을 선택해 주세요." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ message: "파일 크기는 5MB 이하만 허용됩니다." }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return NextResponse.json({ message: "JSON 파일 형식이 올바르지 않습니다." }, { status: 400 });
  }

  let rooms: Prisma.RoomCreateManyInput[];
  let rentPayments: Prisma.RentPaymentCreateManyInput[];
  let repairs: Prisma.RepairCreateManyInput[];

  try {
    assertBackupShape(parsed);
    rooms = parseRooms(parsed.tables.rooms);
    const roomIds = new Set(rooms.map((room) => Number(room.id)));
    rentPayments = parseRentPayments(parsed.tables.rentPayments, roomIds);
    repairs = parseRepairs(parsed.tables.repairs, roomIds);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "백업 파일 검증에 실패했습니다." },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.repair.deleteMany();
      await tx.rentPayment.deleteMany();
      await tx.room.deleteMany();

      if (rooms.length > 0) {
        await tx.room.createMany({ data: rooms });
      }
      if (rentPayments.length > 0) {
        await tx.rentPayment.createMany({ data: rentPayments });
      }
      if (repairs.length > 0) {
        await tx.repair.createMany({ data: repairs });
      }

      await resetSequence(tx, "Room");
      await resetSequence(tx, "RentPayment");
      await resetSequence(tx, "Repair");
    });
  } catch {
    return NextResponse.json({ message: "백업 복원 중 오류가 발생했습니다. 데이터는 변경되지 않았습니다." }, { status: 500 });
  }

  return NextResponse.json({ message: "백업 복원이 완료되었습니다." });
}
