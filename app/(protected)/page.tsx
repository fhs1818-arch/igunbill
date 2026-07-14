import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RestoreBackupForm } from "@/components/RestoreBackupForm";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { addMonths, monthKey, monthLabel, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { syncRentPaymentsForAllRooms } from "@/lib/rent-sync";

export const dynamic = "force-dynamic";

function selectedMonthFrom(searchParams: { month?: string | string[] }) {
  const month = Array.isArray(searchParams.month) ? searchParams.month[0] : searchParams.month;
  return month && /^\d{4}-\d{2}$/.test(month) ? month : monthKey();
}

function monthDateRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(year, monthNumber - 1, 1),
    end: new Date(year, monthNumber, 1)
  };
}

function yearMonthRange(selectedMonth: string) {
  const [year, monthNumber] = selectedMonth.split("-").map(Number);
  const months: string[] = [];

  for (let month = 1; month <= monthNumber; month += 1) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
  }

  return months;
}

function sumAmounts<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((sum, item) => sum + pick(item), 0);
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ month?: string | string[]; restore?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const selectedMonth = selectedMonthFrom(resolvedSearchParams);
  const restoreStatus = Array.isArray(resolvedSearchParams.restore)
    ? resolvedSearchParams.restore[0]
    : resolvedSearchParams.restore;
  const selectedYear = Number(selectedMonth.slice(0, 4));
  const selectedMonthRange = monthDateRange(selectedMonth);
  const cumulativeMonths = yearMonthRange(selectedMonth);
  const cumulativeDateEnd = new Date(selectedYear, Number(selectedMonth.slice(5, 7)), 1);

  await syncRentPaymentsForAllRooms();

  const [adminUser, depositAggregate, monthlyPayments, monthlyRepairs, yearlyPayments, yearlyRepairs] = await Promise.all([
    getCurrentAdminUser(),
    prisma.room.aggregate({
      where: {
        status: {
          in: ["OCCUPIED", "MOVE_OUT_SOON"]
        }
      },
      _sum: {
        deposit: true
      }
    }),
    prisma.rentPayment.findMany({ where: { paymentMonth: selectedMonth } }),
    prisma.repair.findMany({
      where: {
        date: {
          gte: selectedMonthRange.start,
          lt: selectedMonthRange.end
        }
      }
    }),
    prisma.rentPayment.findMany({ where: { paymentMonth: { in: cumulativeMonths } } }),
    prisma.repair.findMany({
      where: {
        date: {
          gte: new Date(selectedYear, 0, 1),
          lt: cumulativeDateEnd
        }
      }
    })
  ]);

  const totalDeposit = depositAggregate._sum.deposit ?? 0;
  const monthlyRentTotal = sumAmounts(monthlyPayments, (payment) => payment.monthlyRent);
  const monthlyPaidTotal = sumAmounts(
    monthlyPayments.filter((payment) => payment.status === "PAID"),
    (payment) => payment.monthlyRent
  );
  const monthlyOverdueTotal = sumAmounts(
    monthlyPayments.filter((payment) => payment.status === "OVERDUE"),
    (payment) => payment.monthlyRent
  );
  const monthlyRepairTotal = sumAmounts(
    monthlyRepairs.filter((repair) => repair.category === "REPAIR"),
    (repair) => repair.amount
  );
  const monthlyBrokerageTotal = sumAmounts(
    monthlyRepairs.filter((repair) => repair.category === "BROKERAGE"),
    (repair) => repair.amount
  );
  const monthlyNetIncome = monthlyPaidTotal - monthlyRepairTotal - monthlyBrokerageTotal;

  const yearlyRentTotal = sumAmounts(yearlyPayments, (payment) => payment.monthlyRent);
  const yearlyPaidTotal = sumAmounts(
    yearlyPayments.filter((payment) => payment.status === "PAID"),
    (payment) => payment.monthlyRent
  );
  const yearlyOverdueTotal = sumAmounts(
    yearlyPayments.filter((payment) => payment.status === "OVERDUE"),
    (payment) => payment.monthlyRent
  );
  const yearlyRepairTotal = sumAmounts(
    yearlyRepairs.filter((repair) => repair.category === "REPAIR"),
    (repair) => repair.amount
  );
  const yearlyBrokerageTotal = sumAmounts(
    yearlyRepairs.filter((repair) => repair.category === "BROKERAGE"),
    (repair) => repair.amount
  );
  const yearlyNetIncome = yearlyPaidTotal - yearlyRepairTotal - yearlyBrokerageTotal;

  const prevMonth = addMonths(selectedMonth, -1);
  const nextMonth = addMonths(selectedMonth, 1);
  const isAdmin = adminUser?.role === "ADMIN";
  const monthlyStats = [
    { label: "총 보증금", value: won(totalDeposit) },
    { label: "선택월 월세 예정금액", value: won(monthlyRentTotal) },
    { label: "선택월 입금완료 금액", value: won(monthlyPaidTotal), tone: "text-emerald-700" },
    { label: "선택월 미납 금액", value: won(monthlyOverdueTotal), tone: "text-red-700" },
    {
      label: "선택월 미납 호실 수",
      value: `${monthlyPayments.filter((payment) => payment.status === "OVERDUE").length}개`,
      tone: "text-red-700"
    },
    { label: "선택월 수리비 합계", value: won(monthlyRepairTotal) },
    { label: "선택월 부동산중개비 합계", value: won(monthlyBrokerageTotal) },
    {
      label: "선택월 순수익",
      value: won(monthlyNetIncome),
      tone: monthlyNetIncome >= 0 ? "text-emerald-700" : "text-red-700"
    }
  ];
  const yearlyStats = [
    { label: "올해 총 월세 예정금액", value: won(yearlyRentTotal) },
    { label: "올해 총 입금완료 금액", value: won(yearlyPaidTotal), tone: "text-emerald-700" },
    { label: "올해 총 미납 금액", value: won(yearlyOverdueTotal), tone: "text-red-700" },
    { label: "올해 총 수리비", value: won(yearlyRepairTotal) },
    { label: "올해 총 부동산중개비", value: won(yearlyBrokerageTotal) },
    {
      label: "올해 순수익",
      value: won(yearlyNetIncome),
      tone: yearlyNetIncome >= 0 ? "text-emerald-700" : "text-red-700"
    }
  ];

  return (
    <>
      <PageHeader
        title="대시보드"
        description={`${monthLabel(selectedMonth)} 기준 이건빌 현황`}
        actions={
          isAdmin ? (
            <div className="flex items-center gap-2">
              <a className="button-primary" href="/api/backup">
                백업 다운로드
              </a>
              <RestoreBackupForm />
            </div>
          ) : null
        }
      />
      <section className="p-8">
        {restoreStatus === "success" ? (
          <div className="mb-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            백업 복원이 완료되었습니다.
          </div>
        ) : null}

        <div className="mb-4 flex items-center justify-between border border-line bg-white px-4 py-3">
          <Link className="button" href={`/?month=${prevMonth}`}>
            이전달
          </Link>
          <div className="text-xl font-bold text-ink">{monthLabel(selectedMonth)}</div>
          <Link className="button" href={`/?month=${nextMonth}`}>
            다음달
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {monthlyStats.map((stat) => (
            <div key={stat.label} className="border border-line bg-white p-5">
              <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
              <p className={`mt-3 text-2xl font-bold ${stat.tone ?? "text-ink"}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <section className="mt-8 border border-line bg-white p-5">
          <h3 className="mb-4 text-lg font-bold text-ink">
            {selectedYear}년 1월~{Number(selectedMonth.slice(5, 7))}월 누적 요약
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {yearlyStats.map((stat) => (
              <div key={stat.label} className="border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
                <p className={`mt-2 text-xl font-bold ${stat.tone ?? "text-ink"}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </>
  );
}
