import Link from "next/link";
import { markPaymentPaid, updatePayment } from "@/app/actions";
import { PageHeader } from "@/components/PageHeader";
import { addMonths, dateInput, monthKey, monthLabel, paymentTone, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { syncRentPaymentsForAllRooms } from "@/lib/rent-sync";

export const dynamic = "force-dynamic";

function selectedMonthFrom(searchParams: { month?: string | string[] }) {
  const month = Array.isArray(searchParams.month) ? searchParams.month[0] : searchParams.month;
  return month && /^\d{4}-\d{2}$/.test(month) ? month : monthKey();
}

function paymentStatusLabel(status: string) {
  return {
    SCHEDULED: "예정",
    PAID: "입금완료",
    OVERDUE: "미납"
  }[status] ?? status;
}

export default async function PaymentsPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedMonth = selectedMonthFrom(resolvedSearchParams);
  await syncRentPaymentsForAllRooms();

  const payments = await prisma.rentPayment.findMany({
    where: { paymentMonth: selectedMonth },
    include: { room: true },
    orderBy: { room: { roomNumber: "asc" } }
  });

  const prevMonth = addMonths(selectedMonth, -1);
  const nextMonth = addMonths(selectedMonth, 1);

  return (
    <>
      <PageHeader title="월세입금관리" description="선택한 월의 월세 납부내역만 표시합니다." />
      <section className="p-3 pb-24 sm:p-4 md:p-8 md:pb-8">
        <div className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-2 border border-line bg-white px-3 py-3 sm:px-4">
          <Link className="button px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm" href={`/payments?month=${prevMonth}`}>이전</Link>
          <div className="text-center text-base font-bold text-ink sm:text-xl">{monthLabel(selectedMonth)}</div>
          <Link className="button px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm" href={`/payments?month=${nextMonth}`}>다음</Link>
        </div>

        <div className="grid gap-3 md:hidden">
          {payments.map((payment) => (
            <form key={payment.id} action={updatePayment} className="border border-line bg-white p-4">
              <input type="hidden" name="id" value={payment.id} />
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-bold text-ink">{payment.room.roomNumber}</p>
                  <p className="mt-1 text-sm text-slate-600">{payment.room.tenantName ?? "-"}</p>
                </div>
                <span className={`rounded-full border px-2 py-1 text-xs font-bold ${paymentTone(payment.status)}`}>
                  {paymentStatusLabel(payment.status)}
                </span>
              </div>
              <div className="grid gap-2 text-sm text-slate-700">
                <div className="flex justify-between gap-3"><span>월세</span><span className="font-semibold">{won(payment.monthlyRent)}</span></div>
                <div className="flex justify-between gap-3"><span>입금일</span><span>{dateInput(payment.paidDate) || "-"}</span></div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <label className="grid gap-1 text-xs font-semibold text-slate-500">
                  입금일
                  <input name="paidDate" type="date" defaultValue={dateInput(payment.paidDate)} />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-slate-500">
                  메모
                  <input name="memo" defaultValue={payment.memo ?? ""} />
                </label>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="submit">수정</button>
                <button className="button-primary" formAction={markPaymentPaid}>입금</button>
              </div>
            </form>
          ))}
          {payments.length === 0 ? (
            <div className="border border-line bg-white p-6 text-center text-sm text-slate-500">선택한 월의 납부내역이 없습니다.</div>
          ) : null}
        </div>

        <div className="table-wrap hidden md:block">
          <table>
            <thead>
              <tr>
                <th>호실</th>
                <th>임차인</th>
                <th>월세</th>
                <th>입금일</th>
                <th>상태</th>
                <th>메모</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td colSpan={7} className="p-0">
                    <form action={updatePayment} className="grid grid-cols-[90px_160px_120px_150px_120px_1fr_190px] gap-2 px-3 py-2">
                      <input type="hidden" name="id" value={payment.id} />
                      <div className="py-2 font-semibold">{payment.room.roomNumber}</div>
                      <div className="py-2">{payment.room.tenantName ?? "-"}</div>
                      <div className="py-2 font-semibold">{won(payment.monthlyRent)}</div>
                      <input name="paidDate" type="date" defaultValue={dateInput(payment.paidDate)} />
                      <div className="py-1.5">
                        <span className={`rounded-full border px-2 py-1 text-xs font-bold ${paymentTone(payment.status)}`}>
                          {paymentStatusLabel(payment.status)}
                        </span>
                      </div>
                      <input name="memo" defaultValue={payment.memo ?? ""} />
                      <div className="flex gap-2">
                        <button className="flex-1" type="submit">수정</button>
                        <button className="button-primary flex-1" formAction={markPaymentPaid}>입금처리</button>
                      </div>
                    </form>
                  </td>
                </tr>
              ))}
              {payments.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">선택한 월의 납부내역이 없습니다.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
