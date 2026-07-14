import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
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

function koreaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric"
  }).formatToParts(date);

  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    day: Number(partMap.day),
    month: partMap.month,
    monthKey: `${partMap.year}-${partMap.month}`,
    year: partMap.year
  };
}

function formatKoreanDate(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Seoul"
  }).format(value);
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

  const todayKorea = koreaDateParts();
  const selectedMonthEnd = `${addMonths(selectedMonth, 1)}-01`;

  const [
    adminUser,
    depositAggregate,
    monthlyPayments,
    monthlyRepairs,
    yearlyPayments,
    yearlyRepairs,
    dueTodayCount,
    currentMonthOverdueCount,
    selectedMonthMoveOutSoonCount,
    vacantRoomCount
  ] = await Promise.all([
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
    }),
    prisma.rentPayment.count({
      where: {
        paymentMonth: todayKorea.monthKey,
        status: {
          not: "PAID"
        },
        room: {
          rentDueDay: todayKorea.day,
          status: {
            in: ["OCCUPIED", "MOVE_OUT_SOON"]
          }
        }
      }
    }),
    prisma.rentPayment.count({
      where: {
        paymentMonth: todayKorea.monthKey,
        status: "OVERDUE"
      }
    }),
    prisma.room.count({
      where: {
        status: "MOVE_OUT_SOON",
        moveOutDate: {
          gte: `${selectedMonth}-01`,
          lt: selectedMonthEnd
        }
      }
    }),
    prisma.room.count({
      where: {
        status: "VACANT"
      }
    })
  ]);

  const isAdmin = adminUser?.role === "ADMIN";
  const recentAuditLogs = isAdmin
    ? await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5
      })
    : [];

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
  const todoCount = dueTodayCount + currentMonthOverdueCount + selectedMonthMoveOutSoonCount;
  const alertCards = [
    {
      href: "/payments",
      label: "입금",
      note: "오늘",
      tone: "border-red-100 bg-red-50 text-red-700",
      value: dueTodayCount
    },
    {
      href: "/payments",
      label: "미납",
      note: "현재월",
      tone: "border-orange-100 bg-orange-50 text-orange-700",
      value: currentMonthOverdueCount
    },
    {
      href: "/move",
      label: "퇴실",
      note: "선택월",
      tone: "border-yellow-100 bg-yellow-50 text-yellow-700",
      value: selectedMonthMoveOutSoonCount
    },
    {
      href: "/rooms",
      label: "공실",
      note: "현재",
      tone: "border-emerald-100 bg-emerald-50 text-emerald-700",
      value: vacantRoomCount
    }
  ];
  const primaryStats = [
    {
      label: "이번달 순수익",
      value: won(monthlyNetIncome),
      tone: monthlyNetIncome >= 0 ? "text-emerald-700" : "text-red-700"
    },
    { label: "총 보증금", value: won(totalDeposit) },
    { label: "월세 예정금액", value: won(monthlyRentTotal) }
  ];
  const moreMonthlyStats = [
    { label: "입금완료 금액", value: won(monthlyPaidTotal), tone: "text-emerald-700" },
    { label: "미납 금액", value: won(monthlyOverdueTotal), tone: "text-red-700" },
    {
      label: "미납 호실 수",
      value: `${monthlyPayments.filter((payment) => payment.status === "OVERDUE").length}건`,
      tone: "text-red-700"
    },
    { label: "수리비 합계", value: won(monthlyRepairTotal) },
    { label: "부동산중개비 합계", value: won(monthlyBrokerageTotal) }
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
      <PageHeader title="대시보드" description={`${monthLabel(selectedMonth)} 기준 이건빌 현황`} />
      <section className="p-3 sm:p-4 md:p-6 xl:p-8">
        {restoreStatus === "success" ? (
          <div className="mb-3 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            백업 복원이 완료되었습니다.
          </div>
        ) : null}

        <div className="mb-3 border border-line bg-white p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">안녕하세요.</p>
              <h3 className="mt-1 text-xl font-bold text-ink md:text-2xl">오늘도 이건빌 관리를 시작합니다.</h3>
            </div>
            <div className="border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500">오늘 할 일</p>
              <p className="mt-1 text-2xl font-bold text-ink">{todoCount}건</p>
            </div>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          {alertCards.map((card) => (
            <Link key={card.label} className={`border p-3 transition hover:shadow-sm sm:p-4 ${card.tone}`} href={card.href}>
              <div className="text-xs font-semibold sm:text-sm">{card.label}</div>
              <div className="mt-1 text-2xl font-bold sm:text-3xl">{card.value}건</div>
              <div className="mt-1 text-[11px] font-semibold opacity-80 sm:text-xs">{card.note}</div>
            </Link>
          ))}
        </div>

        <div className="mb-3 flex items-center justify-between border border-line bg-white px-3 py-2 sm:px-4 sm:py-3">
          <Link className="button px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm" href={`/?month=${prevMonth}`}>
            이전달
          </Link>
          <div className="text-base font-bold text-ink sm:text-xl">{monthLabel(selectedMonth)}</div>
          <Link className="button px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm" href={`/?month=${nextMonth}`}>
            다음달
          </Link>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {primaryStats.map((stat, index) => (
            <div key={stat.label} className={`border border-line bg-white p-4 md:p-5 ${index === 0 ? "xl:col-span-2" : ""}`}>
              <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
              <p className={`${index === 0 ? "mt-3 text-3xl md:text-4xl" : "mt-2 text-2xl"} font-bold ${stat.tone ?? "text-ink"}`}>
                {stat.value}
              </p>
              {index === 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                  <div className="border border-slate-100 bg-slate-50 p-3">
                    <p className="font-semibold text-slate-500">입금완료</p>
                    <p className="mt-1 font-bold text-emerald-700">{won(monthlyPaidTotal)}</p>
                  </div>
                  <div className="border border-slate-100 bg-slate-50 p-3">
                    <p className="font-semibold text-slate-500">수리비</p>
                    <p className="mt-1 font-bold text-ink">{won(monthlyRepairTotal)}</p>
                  </div>
                  <div className="border border-slate-100 bg-slate-50 p-3">
                    <p className="font-semibold text-slate-500">중개비</p>
                    <p className="mt-1 font-bold text-ink">{won(monthlyBrokerageTotal)}</p>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <details className="mb-6 border border-line bg-white p-4">
          <summary className="cursor-pointer text-sm font-bold text-ink">더보기</summary>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {moreMonthlyStats.map((stat) => (
              <div key={stat.label} className="border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
                <p className={`mt-2 text-xl font-bold ${stat.tone ?? "text-ink"}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </details>

        {isAdmin ? (
          <section className="mt-6 border border-line bg-white p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold text-ink">최근 활동로그</h3>
              <Link className="button" href="/audit-logs">
                전체 보기
              </Link>
            </div>
            <div className="grid gap-3">
              {recentAuditLogs.map((log) => (
                <div key={log.id} className="grid gap-2 border border-slate-100 bg-slate-50 p-3 text-sm md:grid-cols-[140px_1fr_160px_2fr]">
                  <div className="font-semibold text-slate-500">{formatKoreanDate(log.createdAt)}</div>
                  <div className="truncate text-slate-700">{log.userEmail}</div>
                  <div className="font-semibold text-slate-700">{log.action}</div>
                  <div className="text-slate-700">{log.description}</div>
                </div>
              ))}
              {recentAuditLogs.length === 0 ? (
                <div className="border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
                  최근 활동로그가 없습니다.
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="mt-6 border border-line bg-white p-4 md:p-5">
          <h3 className="mb-4 text-lg font-bold text-ink">
            {selectedYear}년 1월~{Number(selectedMonth.slice(5, 7))}월 누적 요약
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
