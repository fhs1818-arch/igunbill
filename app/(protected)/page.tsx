import Link from "next/link";
import { AlertTriangle, CalendarClock, CircleDollarSign, Wrench } from "lucide-react";
import { ActionLink } from "@/components/ui/ActionButton";
import { AppCard } from "@/components/ui/AppCard";
import { MoneyText } from "@/components/ui/MoneyText";
import { StatCard } from "@/components/ui/StatCard";
import { addMonths, monthKey, monthLabel } from "@/lib/format";
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

function addDaysToDateString(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function CountText({ value }: { value: number }) {
  return (
    <span className="inline-flex items-baseline whitespace-nowrap tabular-nums">
      <span className="font-extrabold">{value}</span>
      <span className="ml-0.5 text-[0.72em] font-semibold">건</span>
    </span>
  );
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
    depositAggregate,
    monthlyPayments,
    monthlyRepairs,
    yearlyPayments,
    yearlyRepairs,
    dueTodayCount,
    currentMonthOverdueCount,
    vacantRoomCount,
    sevenDayMoveOutSoonCount,
    unpaidRepairCount
  ] = await Promise.all([
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
        status: "VACANT"
      }
    }),
    prisma.room.count({
      where: {
        status: "MOVE_OUT_SOON",
        moveOutDate: {
          gte: `${todayKorea.year}-${todayKorea.month}-${String(todayKorea.day).padStart(2, "0")}`,
          lte: addDaysToDateString(`${todayKorea.year}-${todayKorea.month}-${String(todayKorea.day).padStart(2, "0")}`, 7)
        }
      }
    }),
    prisma.repair.count({
      where: {
        isPaid: false
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
  const taskCards = [
    {
      href: "/payments",
      Icon: AlertTriangle,
      label: "미납",
      toneClass: "bg-red-50 text-red-700",
      value: currentMonthOverdueCount
    },
    {
      href: "/payments",
      Icon: CircleDollarSign,
      label: "입금예정",
      toneClass: "bg-blue-50 text-brand",
      value: dueTodayCount
    },
    {
      href: "/move",
      Icon: CalendarClock,
      label: "퇴실예정",
      toneClass: "bg-amber-50 text-amber-700",
      value: sevenDayMoveOutSoonCount
    },
    {
      href: "/repairs",
      Icon: Wrench,
      label: "미결제 수리",
      toneClass: "bg-amber-50 text-amber-700",
      value: unpaidRepairCount
    }
  ];
  const buildingCards = [
    { label: "입금완료", value: <MoneyText amount={monthlyPaidTotal} tone="positive" />, tone: "positive" as const },
    { label: "월세예정", value: <MoneyText amount={monthlyRentTotal} /> },
    { label: "총보증금", value: <MoneyText amount={totalDeposit} /> },
    {
      href: "/rooms",
      label: "공실",
      value: <CountText value={vacantRoomCount} />
    }
  ];
  const yearlyStats = [
    { label: "올해 총 월세 예정금액", value: yearlyRentTotal },
    { label: "올해 총 입금완료 금액", value: yearlyPaidTotal, tone: "positive" as const },
    { label: "올해 총 미납 금액", value: yearlyOverdueTotal, tone: "negative" as const },
    { label: "올해 총 수리비", value: yearlyRepairTotal },
    { label: "올해 총 부동산중개비", value: yearlyBrokerageTotal },
    {
      label: "올해 순수익",
      value: yearlyNetIncome,
      tone: yearlyNetIncome >= 0 ? ("positive" as const) : ("negative" as const)
    }
  ];

  return (
    <section className="space-y-3 p-4 pb-24 md:p-8 md:pb-8">
        {restoreStatus === "success" ? (
          <AppCard className="border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700">
            백업 복원이 완료되었습니다.
          </AppCard>
        ) : null}

        <div className="flex items-center justify-center">
          <div className="inline-grid grid-cols-[40px_1fr_40px] items-center rounded-full border border-line bg-white px-2 py-1.5 shadow-sm shadow-slate-200/40">
            <ActionLink className="min-h-8 border-transparent bg-transparent px-2 py-1 text-lg leading-none hover:bg-slate-100" href={`/?month=${prevMonth}`}>
              〈
            </ActionLink>
            <div className="min-w-32 px-2 text-center text-sm font-bold text-ink">
              {monthLabel(selectedMonth)}
            </div>
            <ActionLink className="min-h-8 border-transparent bg-transparent px-2 py-1 text-lg leading-none hover:bg-slate-100" href={`/?month=${nextMonth}`}>
              〉
            </ActionLink>
          </div>
        </div>

        <AppCard className="p-4 md:p-5">
          <p className="text-4xl font-extrabold tracking-normal text-ink md:text-5xl">
            <MoneyText
              amount={monthlyNetIncome}
              className="text-4xl md:text-5xl"
              tone={monthlyNetIncome >= 0 ? "positive" : "negative"}
            />
          </p>
          <p className="mt-1 text-xs font-normal text-slate-500">이번 달 순수익</p>
        </AppCard>

        <section>
          <h2 className="mb-2 text-base font-bold text-ink">오늘 해야 할 일</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {taskCards.map(({ Icon, ...card }) => (
              <Link key={card.label} href={card.href} className="block active:scale-[0.99] md:hover:-translate-y-0.5 md:hover:transition-transform">
                <AppCard className="h-full p-3 transition md:hover:border-brand">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[1.65rem] font-bold leading-tight text-ink">
                      <CountText value={card.value} />
                    </p>
                    <div className={`rounded-lg p-1.5 ${card.toneClass}`}>
                      <Icon className="h-5 w-5" strokeWidth={2.1} />
                    </div>
                  </div>
                  <p className="mt-1 text-xs font-normal text-slate-500">{card.label}</p>
                </AppCard>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-base font-bold text-ink">건물 현황</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {buildingCards.map((card) =>
              card.href ? (
                <Link key={card.label} href={card.href} className="block active:scale-[0.99] md:hover:-translate-y-0.5 md:hover:transition-transform">
                  <StatCard className="h-full p-3" label={card.label} value={card.value} />
                </Link>
              ) : (
                <StatCard key={card.label} className="p-3" label={card.label} tone={card.tone ?? "default"} value={card.value} />
              )
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-base font-bold text-ink">이번 달 지출</h2>
          <div className="grid grid-cols-2 gap-2">
            <StatCard className="p-3" label="수리비" value={<MoneyText amount={monthlyRepairTotal} />} />
            <StatCard className="p-3" label="중개비" value={<MoneyText amount={monthlyBrokerageTotal} />} />
          </div>
        </section>

        <details className="rounded-lg border border-line bg-white p-3 shadow-sm shadow-slate-200/40">
          <summary className="cursor-pointer list-none text-base font-bold text-ink">
            연간 누적 요약
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {yearlyStats.map((stat) => (
              <StatCard
                key={stat.label}
                className="p-3 shadow-none"
                label={stat.label}
                tone={stat.tone ?? "default"}
                value={<MoneyText amount={stat.value} tone={stat.tone ?? "default"} />}
              />
            ))}
          </div>
        </details>
      </section>
  );
}
