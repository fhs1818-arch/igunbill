import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ActionLink } from "@/components/ui/ActionButton";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
import { Section } from "@/components/ui/Section";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
      label: "입금예정",
      note: "오늘 기준",
      tone: "brand" as const,
      value: dueTodayCount
    },
    {
      href: "/payments",
      label: "미납",
      note: "현재 월 기준",
      tone: "negative" as const,
      value: currentMonthOverdueCount
    },
    {
      href: "/move",
      label: "퇴실예정",
      note: "선택월 기준",
      tone: "warning" as const,
      value: selectedMonthMoveOutSoonCount
    },
    {
      href: "/rooms",
      label: "공실",
      note: "현재 상태",
      tone: "default" as const,
      value: vacantRoomCount
    }
  ];
  const quickActions = [
    { href: "/rooms", label: "호실 관리" },
    { href: "/payments", label: "월세 관리" },
    { href: "/repairs", label: "수리 관리" },
    { href: "/tax", label: "세무" }
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
      <section className="space-y-4 p-4 pb-24 md:p-8 md:pb-8">
        {restoreStatus === "success" ? (
          <AppCard className="border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700">
            백업 복원이 완료되었습니다.
          </AppCard>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <ActionLink className="px-3 py-2 text-xs" href={`/?month=${prevMonth}`}>
            이전달
          </ActionLink>
          <div className="rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm shadow-slate-200/40">
            {monthLabel(selectedMonth)}
          </div>
          <ActionLink className="px-3 py-2 text-xs" href={`/?month=${nextMonth}`}>
            다음달
          </ActionLink>
        </div>

        <AppCard className="overflow-hidden p-5 md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusBadge tone={monthlyNetIncome >= 0 ? "positive" : "negative"}>이번 달 순수익</StatusBadge>
                <StatusBadge tone="default">오늘 할 일 {todoCount}건</StatusBadge>
              </div>
              <p className="text-sm font-semibold text-slate-500">입금완료 월세에서 수리비와 중개비를 뺀 금액</p>
              <p className="mt-3 text-4xl font-bold tracking-normal text-ink md:text-5xl">
                <MoneyText
                  amount={monthlyNetIncome}
                  className="text-4xl md:text-5xl"
                  tone={monthlyNetIncome >= 0 ? "positive" : "negative"}
                />
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-500">입금완료</p>
                <p className="mt-1 text-lg font-bold text-emerald-700">{won(monthlyPaidTotal)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-500">월세 예정</p>
                <p className="mt-1 text-lg font-bold text-ink">{won(monthlyRentTotal)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-500">총 보증금</p>
                <p className="mt-1 text-lg font-bold text-ink">{won(totalDeposit)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-500">미납 금액</p>
                <p className="mt-1 text-lg font-bold text-red-700">{won(monthlyOverdueTotal)}</p>
              </div>
            </div>
          </div>
        </AppCard>

        <Section title="오늘 할 일" description="매일 확인해야 하는 핵심 알림입니다.">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {alertCards.map((card) => (
              <Link key={card.label} href={card.href}>
                <AppCard className="h-full p-4 transition hover:border-brand">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-600">{card.label}</p>
                    <StatusBadge tone={card.tone}>{card.note}</StatusBadge>
                  </div>
                  <p className="mt-4 text-3xl font-bold text-ink">{card.value}건</p>
                </AppCard>
              </Link>
            ))}
          </div>
        </Section>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Section title="이번 달 지출" description="순수익 계산에 반영되는 비용입니다.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatCard label="수리비" value={<MoneyText amount={monthlyRepairTotal} />} />
              <StatCard label="중개비" value={<MoneyText amount={monthlyBrokerageTotal} />} />
            </div>
          </Section>

          <Section title="빠른 실행" description="자주 쓰는 관리 화면으로 바로 이동합니다.">
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <ActionLink key={action.href} className="w-full justify-center py-3" href={action.href} variant="secondary">
                  {action.label}
                </ActionLink>
              ))}
            </div>
          </Section>
        </div>

        {isAdmin ? (
          <Section
            actions={<ActionLink href="/audit-logs">전체 보기</ActionLink>}
            title="최근 활동"
            description="최근 관리자 작업 이력입니다."
          >
            {recentAuditLogs.length > 0 ? (
              <div className="grid gap-3">
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

        <Section title={`${selectedYear}년 1월~${Number(selectedMonth.slice(5, 7))}월 누적 요약`}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {yearlyStats.map((stat) => (
              <StatCard
                key={stat.label}
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
