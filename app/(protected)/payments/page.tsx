import { markPaymentPaid, updatePayment } from "@/app/actions";
import { PageHeader } from "@/components/PageHeader";
import { ActionButton, ActionLink } from "@/components/ui/ActionButton";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { addMonths, dateInput, monthKey, monthLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { syncRentPaymentsForAllRooms } from "@/lib/rent-sync";

export const dynamic = "force-dynamic";

function selectedMonthFrom(searchParams: { month?: string | string[] }) {
  const month = Array.isArray(searchParams.month) ? searchParams.month[0] : searchParams.month;
  return month && /^\d{4}-\d{2}$/.test(month) ? month : monthKey();
}

function paymentStatusLabel(status: string) {
  return {
    SCHEDULED: "입금예정",
    PAID: "입금완료",
    OVERDUE: "미납"
  }[status] ?? status;
}

function paymentStatusTone(status: string) {
  return {
    SCHEDULED: "brand",
    PAID: "positive",
    OVERDUE: "negative"
  }[status] as "brand" | "positive" | "negative";
}

const paymentGridStyle = {
  gridTemplateColumns: "90px 160px 130px 150px 135px minmax(160px, 1fr) 210px",
  minWidth: "1055px"
};

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
      <section className="space-y-4 p-4 pb-24 md:p-8 md:pb-8">
        <AppCard className="p-3">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <ActionLink className="min-w-16 px-3 py-2 text-xs sm:text-sm" href={`/payments?month=${prevMonth}`}>
              이전
            </ActionLink>
            <div className="min-w-0 text-center">
              <p className="text-xs font-semibold text-slate-500">조회월</p>
              <p className="truncate text-lg font-bold text-ink sm:text-2xl">{monthLabel(selectedMonth)}</p>
            </div>
            <ActionLink className="min-w-16 px-3 py-2 text-xs sm:text-sm" href={`/payments?month=${nextMonth}`}>
              다음
            </ActionLink>
          </div>
        </AppCard>

        <div className="grid gap-3 md:hidden">
          {payments.map((payment) => (
            <form key={payment.id} action={updatePayment}>
              <input type="hidden" name="id" value={payment.id} />
              <AppCard>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-ink">{payment.room.roomNumber}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-600">{payment.room.tenantName ?? "-"}</p>
                  </div>
                  <StatusBadge tone={paymentStatusTone(payment.status)}>
                    {paymentStatusLabel(payment.status)}
                  </StatusBadge>
                </div>

                <div className="rounded-lg bg-slate-50 p-4 text-center">
                  <p className="text-xs font-bold text-slate-500">월세</p>
                  <p className="mt-1 text-4xl font-bold text-ink">
                    <MoneyText amount={payment.monthlyRent} className="text-4xl" />
                  </p>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-700">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">납부월</span>
                    <span className="font-semibold">{payment.paymentMonth}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">입금일</span>
                    <span className="font-semibold">{dateInput(payment.paidDate) || "-"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">비고</span>
                    <span className="min-w-0 break-words text-right font-semibold">{payment.memo || "-"}</span>
                  </div>
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
                  <ActionButton type="submit">수정</ActionButton>
                  <ActionButton formAction={markPaymentPaid} variant="primary">입금처리</ActionButton>
                </div>
              </AppCard>
            </form>
          ))}
          {payments.length === 0 ? (
            <EmptyState title="선택한 달의 월세 내역이 없습니다." />
          ) : null}
        </div>

        <Section className="hidden md:block" title="월세 내역" description="선택한 월의 자동 생성된 납부내역입니다.">
          <div className="table-wrap rounded-lg">
            <table>
              <thead>
                <tr>
                  <th colSpan={7} className="p-0">
                    <div className="grid items-center gap-2 px-3 py-3" style={paymentGridStyle}>
                      <span className="text-center">호실</span>
                      <span className="text-left">임차인</span>
                      <span className="text-right">월세</span>
                      <span className="text-center">입금일</span>
                      <span className="text-center">상태</span>
                      <span className="text-left">메모</span>
                      <span className="text-center">관리</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="transition-colors hover:bg-slate-50">
                    <td colSpan={7} className="p-0">
                      <form action={updatePayment} className="grid items-center gap-2 px-3 py-3" style={paymentGridStyle}>
                        <input type="hidden" name="id" value={payment.id} />
                        <div className="py-2 text-center font-bold text-ink">{payment.room.roomNumber}</div>
                        <div className="py-2 text-left text-slate-700">{payment.room.tenantName ?? "-"}</div>
                        <div className="py-2 text-right">
                          <MoneyText amount={payment.monthlyRent} />
                        </div>
                        <input className="mx-auto text-center" name="paidDate" type="date" defaultValue={dateInput(payment.paidDate)} />
                        <div className="flex items-center justify-center">
                          <StatusBadge tone={paymentStatusTone(payment.status)}>
                            {paymentStatusLabel(payment.status)}
                          </StatusBadge>
                        </div>
                        <input name="memo" defaultValue={payment.memo ?? ""} />
                        <div className="flex items-center justify-center gap-2">
                          <ActionButton className="h-11 min-w-0 flex-1 whitespace-nowrap px-3" type="submit">수정</ActionButton>
                          <ActionButton className="h-11 min-w-0 flex-1 whitespace-nowrap px-3" formAction={markPaymentPaid} variant="primary">입금처리</ActionButton>
                        </div>
                      </form>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8">
                      <EmptyState title="선택한 달의 월세 내역이 없습니다." />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Section>
      </section>
    </>
  );
}
