import { PaymentStatus, RepairCategory, RepairPayer, RoomStatus } from "@prisma/client";

export function won(value: number | null | undefined) {
  return `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(value ?? 0)}만원`;
}

export function dateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${year}년 ${monthNumber}월`;
}

export function addMonths(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthKey(new Date(year, monthNumber - 1 + amount, 1));
}

export function roomStatusLabel(status: RoomStatus) {
  return {
    VACANT: "공실",
    OCCUPIED: "입주중",
    MOVE_OUT_SOON: "퇴실예정"
  }[status];
}

export function paymentStatusLabel(status: PaymentStatus) {
  return {
    SCHEDULED: "예정",
    PAID: "입금완료",
    OVERDUE: "미납"
  }[status];
}

export function repairPayerLabel(payer: RepairPayer) {
  return {
    LANDLORD: "임대인",
    TENANT: "임차인"
  }[payer];
}

export function repairCategoryLabel(category: RepairCategory) {
  return {
    REPAIR: "수리비",
    SUPPLIES: "소모품",
    BROKERAGE: "부동산중개비",
    OTHER: "기타"
  }[category];
}

export function paymentTone(status: PaymentStatus) {
  if (status === "PAID") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (status === "OVERDUE") return "text-red-700 bg-red-50 border-red-200";
  return "text-slate-700 bg-slate-50 border-slate-200";
}

export function toInt(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").replaceAll(",", "").trim();
  return value ? Number(value) : 0;
}

export function toDate(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function toDateString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

export function toStringOrNull(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}
