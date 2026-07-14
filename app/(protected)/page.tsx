import Link from "next/link";
import { AlertTriangle, CalendarClock, CircleDollarSign, Wrench } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ActionLink } from "@/components/ui/ActionButton";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
import { Section } from "@/components/ui/Section";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCurrentAdminUser } from "@/lib/admin-auth";
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
    hour: "2-digit",
    hourCycle: "h23",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric"
  }).formatToParts(date);

  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    day: Number(partMap.day),
    hour: Number(partMap.hour ?? 0),
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

function greetingForHour(hour: number) {
  if (hour < 12) return "좋은 아침입니다. 오늘도 건물 관리를 시작해볼까요?";
  if (hour < 18) return "좋은 오후입니다. 오늘의 임대 현황을 확인해볼까요?";
  return "좋은 저녁입니다. 오늘 마무리할 관리를 확인해볼까요?";
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
    vacantRoomCount,
    sevenDayMoveOutSoonCount,
    unpaidRepairCount
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
  const todoCount = dueTodayCount + currentMonthOverdueCount + sevenDayMoveOutSoonCount + unpaidRepairCount;
  const alertCards = [
    {
      href: "/payments",
      Icon: CircleDollarSign,
      label: "오늘 입금예정",
      note: "오늘 기준",
      tone: "brand" as const,
      value: dueTodayCount
    },
    {
      href: "/payments",
      Icon: AlertTriangle,
      label: "현재 미납",
      note: "현재 월 기준",
      tone: "negative" as const,
      value: currentMonthOverdueCount
    },
    {
      href: "/move",
      Icon: CalendarClock,
      label: "7일 이내 퇴실예정",
      note: "오늘부터 7일",
      tone: "warning" as const,
      value: sevenDayMoveOutSoonCount
    },
    {
      href: "/repairs",
      Icon: Wrench,
      label: "미결제 수리",
      note: "현재 상태",
      tone: "warning" as const,
      value: unpaidRepairCount
    }
  ];
  const urgentAlerts = [
    {
      href: "/payments",
      Icon: AlertTriangle,
      label: "미납",
      message: `현재 월 미납 ${currentMonthOverdueCount}건을 확인해 주세요.`,
      tone: "negative" as const,
      value: currentMonthOverdueCount
    },
    {
      href: "/move",
      Icon: CalendarClock,
      label: "퇴실예정",
      message: `7일 이내 퇴실예정 ${sevenDayMoveOutSoonCount}건이 있습니다.`,
      tone: "warning" as const,
      value: sevenDayMoveOutSoonCount
    },
    {
      href: "/repairs",
      Icon: Wrench,
      label: "미결제 수리",
      message: `미결제 수리 ${unpaidRepairCount}건을 확인해 주세요.`,
      tone: "warning" as const,
      value: unpaidRepairCount
    },
    {
      href: "/payments",
      Icon: CircleDollarSign,
      label: "입금예정",
      message: `오늘 입금예정 ${dueTodayCount}건이 있습니다.`,
      tone: "brand" as const,
      value: dueTodayCount
    }
  ].filter((alert) => alert.value > 0);
  const statusSummaryCards = [
    {
      href: "/rooms",
      label: "공실",
      note: "현재 상태",
      tone: "default" as const,
      value: vacantRoomCount
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
    <>
      <PageHeader title="대시보드" description={`${monthLabel(selectedMonth)} 기준 이건빌 현황`} />
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
          <p className="text-sm font-bold text-brand">이건빌</p>
          <h2 className="mt-1 text-2xl font-extrabold leading-snug text-ink md:text-3xl">
            {greetingForHour(todayKorea.hour)}
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">오늘 해야 할 일 {todoCount}건을 먼저 확인하세요.</p>
        </AppCard>

        <Section title="오늘 해야 할 일" description="현재 데이터 기준으로 계산한 실시간 알림입니다." className="p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {alertCards.map(({ Icon, ...card }) => (
              <Link key={card.label} href={card.href} className="block active:scale-[0.99] md:hover:-translate-y-0.5 md:hover:transition-transform">
                <AppCard className="h-full p-4 transition md:hover:border-brand">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`rounded-lg p-2 ${
                      card.tone === "negative" ? "bg-red-50 text-red-700" : card.tone === "warning" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-brand"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <StatusBadge tone={card.tone}>{card.note}</StatusBadge>
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-600">{card.label}</p>
                  <p className="mt-1 text-3xl font-extrabold text-ink">{card.value}건</p>
                </AppCard>
              </Link>
            ))}
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {urgentAlerts.length > 0 ? (
              urgentAlerts.map(({ Icon, ...alert }) => (
                <Link key={alert.label} href={alert.href} className="block active:scale-[0.99] md:hover:transition-opacity md:hover:opacity-90">
                  <div className="flex items-center gap-3 rounded-lg border border-line bg-slate-50 p-3">
                    <StatusBadge tone={alert.tone} className="shrink-0">
                      <Icon className="mr-1 h-3.5 w-3.5" />
                      {alert.label}
                    </StatusBadge>
                    <p className="text-sm font-semibold text-slate-700">{alert.message}</p>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState title="오늘 처리할 긴급한 일이 없습니다." />
            )}
          </div>
        </Section>

        <AppCard className="overflow-hidden p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge tone={monthlyNetIncome >= 0 ? "positive" : "negative"}>이번 달 순수익</StatusBadge>
                <StatusBadge tone="default">오늘 할 일 {todoCount}건</StatusBadge>
              </div>
              <p className="text-sm font-semibold text-slate-500">입금완료 월세 - 수리비 - 중개비</p>
              <p className="mt-2 text-4xl font-bold tracking-normal text-ink md:text-5xl">
                <MoneyText
                  amount={monthlyNetIncome}
                  className="text-4xl md:text-5xl"
                  tone={monthlyNetIncome >= 0 ? "positive" : "negative"}
                />
              </p>
            </div>
          </div>
        </AppCard>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            className="p-3"
            label="입금완료"
            tone="positive"
            value={<MoneyText amount={monthlyPaidTotal} tone="positive" />}
          />
          <StatCard className="p-3" label="월세예정" value={<MoneyText amount={monthlyRentTotal} />} />
          <StatCard className="p-3" label="총보증금" value={<MoneyText amount={totalDeposit} />} />
          <StatCard
            className="p-3"
            label="미납금액"
            tone="negative"
            value={<MoneyText amount={monthlyOverdueTotal} tone="negative" />}
          />
        </div>

        <Section title="기타 현황" description="현재 상태 기준으로 참고할 항목입니다." className="p-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {statusSummaryCards.map((card) => (
              <Link key={card.label} href={card.href}>
                <AppCard className="h-full p-3 transition active:scale-[0.99] md:hover:border-brand">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-600">{card.label}</p>
                    <StatusBadge tone={card.tone}>{card.note}</StatusBadge>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-ink">{card.value}건</p>
                </AppCard>
              </Link>
            ))}
          </div>
        </Section>

        <Section title="이번 달 지출" description="순수익 계산에 반영되는 비용입니다." className="p-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard className="p-3" label="수리비" value={<MoneyText amount={monthlyRepairTotal} />} />
            <StatCard className="p-3" label="중개비" value={<MoneyText amount={monthlyBrokerageTotal} />} />
          </div>
        </Section>

        {isAdmin ? (
          <Section
            actions={<ActionLink href="/audit-logs">전체 보기</ActionLink>}
            title="최근 활동"
            description="최근 관리자 작업 이력입니다."
            className="p-4"
          >
            {recentAuditLogs.length > 0 ? (
              <div className="grid gap-2">
                {recentAuditLogs.map((log) => (
                  <AppCard key={log.id} className="bg-slate-50 p-3 shadow-none md:grid md:grid-cols-[140px_1fr_160px_2fr] md:gap-3">
                    <div className="text-sm font-bold text-slate-500">{formatKoreanDate(log.createdAt)}</div>
                    <div className="truncate text-sm text-slate-700">{log.userEmail}</div>
                    <div className="mt-1 text-sm font-bold text-ink md:mt-0">{log.action}</div>
                    <div className="mt-1 text-sm text-slate-700 md:mt-0">{log.description}</div>
                  </AppCard>
                ))}
              </div>
            ) : (
              <EmptyState title="최근 활동이 없습니다." description="기록된 관리자 작업 이력이 아직 없습니다." />
            )}
          </Section>
        ) : null}

        <Section title={`${selectedYear}년 1월~${Number(selectedMonth.slice(5, 7))}월 누적 요약`} className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {yearlyStats.map((stat) => (
              <StatCard
                key={stat.label}
                className="p-3"
                label={stat.label}
                tone={stat.tone ?? "default"}
                value={<MoneyText amount={stat.value} tone={stat.tone ?? "default"} />}
              />
            ))}
          </div>
        </Section>
      </section>
    </>
  );
}
