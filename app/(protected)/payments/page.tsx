import Link from "next/link";
import { markPaymentPaid, updatePayment } from "@/app/actions";
import { PageHeader } from "@/components/PageHeader";
import { addMonths, dateInput, monthKey, monthLabel, paymentStatusLabel, paymentTone, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { syncRentPaymentsForAllRooms } from "@/lib/rent-sync";

export const dynamic = "force-dynamic";

function selectedMonthFrom(searchParams: { month?: string | string[] }) {
  const month = Array.isArray(searchParams.month) ? searchParams.month[0] : searchParams.month;
  return month && /^\d{4}-\d{2}$/.test(month) ? month : monthKey();
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
      <section className="p-8">
        <div className="mb-4 flex items-center justify-between border border-line bg-white px-4 py-3">
          <Link className="button" href={`/payments?month=${prevMonth}`}>이전달</Link>
          <div className="flex items-center gap-4 text-xl font-bold text-ink">
            <Link className="button" href={`/payments?month=${prevMonth}`} aria-label="이전달">◀</Link>
            <span>{monthLabel(selectedMonth)}</span>
            <Link className="button" href={`/payments?month=${nextMonth}`} aria-label="다음달">▶</Link>
          </div>
          <Link className="button" href={`/payments?month=${nextMonth}`}>다음달</Link>
        </div>

        <div className="table-wrap">
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
