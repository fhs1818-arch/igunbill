import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireAdmin } from "@/lib/admin-auth";
import { dateInput } from "@/lib/format";
import {
  getTaxReport,
  normalizeTaxRange,
  paymentStatusText,
  repairCategoryText,
  repairPayerText
} from "@/lib/tax-report";

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function currentYearRange() {
  const today = new Date();
  return {
    from: `${today.getFullYear()}-01-01`,
    to: dateInput(today)
  };
}

function previousYearRange() {
  const year = new Date().getFullYear() - 1;
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`
  };
}

function currentMonthRange() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  return {
    from: `${year}-${String(month + 1).padStart(2, "0")}-01`,
    to: dateInput(new Date(year, month + 1, 0))
  };
}

function rangeHref(range: { from: string; to: string }) {
  return `/tax?from=${range.from}&to=${range.to}`;
}

function InfoRow({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className={`min-w-0 text-right break-words ${strong ? "font-bold text-ink" : "text-slate-700"}`}>
        {value || "-"}
      </span>
    </div>
  );
}

function taxPaymentTone(status: string) {
  if (status === "PAID") return "positive" as const;
  if (status === "OVERDUE") return "negative" as const;
  return "brand" as const;
}

export default async function TaxPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string | string[]; to?: string | string[] }>;
}) {
  await requireAdmin();

  const resolvedSearchParams = await searchParams;
  const range = normalizeTaxRange(firstParam(resolvedSearchParams.from), firstParam(resolvedSearchParams.to));
  const report = await getTaxReport(range);
  const downloadHref = `/api/tax/export?from=${report.from}&to=${report.to}`;
  const quickRanges = [
    { label: "올해", range: currentYearRange() },
    { label: "전년도", range: previousYearRange() },
    { label: "이번 달", range: currentMonthRange() }
  ];

  return (
    <>
      <PageHeader title="세무" description="기간별 임대수입과 필요경비를 엑셀로 다운로드합니다." />
      <section className="p-3 pb-24 sm:p-4 md:p-8 md:pb-8">
        <div className="mb-4 border border-line bg-white p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {quickRanges.map((item) => (
              <Link key={item.label} className="button" href={rangeHref(item.range)}>
                {item.label}
              </Link>
            ))}
          </div>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="grid gap-1 text-xs font-semibold text-slate-500">
              시작일
              <input name="from" type="date" defaultValue={report.from} />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-500">
              종료일
              <input name="to" type="date" defaultValue={report.to} />
            </label>
            <div className="flex items-end">
              <button className="button-primary w-full" type="submit">
                조회
              </button>
            </div>
          </form>
          <a className="button-primary mt-3 w-full md:w-auto" href={downloadHref}>
            Excel 다운로드
          </a>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="border border-line bg-white p-4">
            <p className="text-sm font-semibold text-slate-500">총수입</p>
            <p className="mt-2 text-[1.65rem] font-bold leading-tight text-emerald-700">
              <MoneyText amount={report.summary.totalIncome} tone="positive" />
            </p>
            <p className="mt-1 text-xs text-slate-500">입금완료 월세 기준</p>
          </div>
          <div className="border border-line bg-white p-4">
            <p className="text-sm font-semibold text-slate-500">총지출</p>
            <p className="mt-2 text-[1.65rem] font-bold leading-tight text-red-700">
              <MoneyText amount={report.summary.totalExpense} tone="negative" />
            </p>
            <p className="mt-1 text-xs text-slate-500">임대인 부담 경비 기준</p>
          </div>
          <div className="border border-line bg-white p-4">
            <p className="text-sm font-semibold text-slate-500">순수익</p>
            <p className={`mt-2 text-[1.65rem] font-bold leading-tight ${report.summary.netIncome >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              <MoneyText amount={report.summary.netIncome} tone={report.summary.netIncome >= 0 ? "positive" : "negative"} />
            </p>
            <p className="mt-1 text-xs text-slate-500">총수입 - 총지출</p>
          </div>
        </div>

        <section className="mb-6 border border-line bg-white p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-bold text-ink">임대수입 미리보기</h3>
            <span className="text-sm text-slate-500">금액 단위: 만원</span>
          </div>

          <div className="grid gap-3 md:hidden">
            {report.incomes.slice(0, 50).map((income, index) => (
              <article key={`${income.roomNumber}-${income.date}-${index}`} className="border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-ink">{income.roomNumber}</p>
                    <p className="mt-1 break-words text-sm text-slate-600">{income.tenantName || "-"}</p>
                  </div>
                  <StatusBadge tone={taxPaymentTone(income.status)}>
                    {paymentStatusText(income.status)}
                  </StatusBadge>
                </div>
                <div className="grid gap-2">
                  <InfoRow label="날짜" value={income.date} />
                  <InfoRow label="건물" value={income.building} />
                  <InfoRow label="호실" value={income.roomNumber} />
                  <InfoRow label="세입자" value={income.tenantName || "-"} />
                  <InfoRow label="월세" value={<MoneyText amount={income.monthlyRent} tone="positive" />} strong />
                  <InfoRow label="관리비" value={income.managementFee || ""} />
                  <InfoRow label="입금일" value={income.paidDate || "-"} />
                  <InfoRow label="상태" value={paymentStatusText(income.status)} strong />
                </div>
              </article>
            ))}
            {report.incomes.length === 0 ? (
              <EmptyState title="선택한 기간의 임대수입 내역이 없습니다." />
            ) : null}
          </div>

          <div className="table-wrap hidden md:block">
            <table>
              <thead>
                <tr>
                  <th className="text-center">날짜</th>
                  <th className="text-left">건물</th>
                  <th className="text-center">호실</th>
                  <th className="text-left">세입자</th>
                  <th className="text-right">월세</th>
                  <th className="text-right">관리비</th>
                  <th className="text-center">입금일</th>
                  <th className="text-center">상태</th>
                  <th className="text-left">비고</th>
                </tr>
              </thead>
              <tbody>
                {report.incomes.slice(0, 50).map((income, index) => (
                  <tr key={`${income.roomNumber}-${income.date}-${index}`}>
                    <td className="text-center">{income.date}</td>
                    <td>{income.building}</td>
                    <td className="text-center">{income.roomNumber}</td>
                    <td>{income.tenantName || "-"}</td>
                    <td className="text-right"><MoneyText amount={income.monthlyRent} /></td>
                    <td className="text-right">{income.managementFee || ""}</td>
                    <td className="text-center">{income.paidDate || "-"}</td>
                    <td className="text-center"><StatusBadge tone={taxPaymentTone(income.status)}>{paymentStatusText(income.status)}</StatusBadge></td>
                    <td>{income.memo || ""}</td>
                  </tr>
                ))}
                {report.incomes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8">
                      <EmptyState title="선택한 기간의 임대수입 내역이 없습니다." />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {report.incomes.length > 50 ? (
            <p className="mt-2 text-sm text-slate-500">미리보기는 50건까지만 표시됩니다. 전체 자료는 Excel에서 확인하세요.</p>
          ) : null}
        </section>

        <section className="border border-line bg-white p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-bold text-ink">필요경비 미리보기</h3>
            <span className="text-sm text-slate-500">금액 단위: 만원</span>
          </div>

          <div className="grid gap-3 md:hidden">
            {report.expenses.slice(0, 50).map((expense, index) => (
              <article key={`${expense.date}-${expense.content}-${index}`} className="border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-bold text-ink">{expense.content}</p>
                    <p className="mt-1 text-sm text-slate-600">{expense.date}</p>
                  </div>
                  <StatusBadge tone="default">
                    {repairCategoryText(expense.category)}
                  </StatusBadge>
                </div>
                <div className="grid gap-2">
                  <InfoRow label="날짜" value={expense.date} />
                  <InfoRow label="건물" value={expense.building} />
                  <InfoRow label="구분" value={repairCategoryText(expense.category)} />
                  <InfoRow label="내용" value={expense.content} />
                  <InfoRow label="금액" value={<MoneyText amount={expense.amount} tone="negative" />} strong />
                  <InfoRow label="거래처" value={expense.vendor || ""} />
                  <InfoRow label="증빙" value={expense.evidence || ""} />
                  <InfoRow label="부담자" value={repairPayerText(expense.payer)} strong />
                </div>
              </article>
            ))}
            {report.expenses.length === 0 ? (
              <EmptyState title="선택한 기간의 필요경비 내역이 없습니다." />
            ) : null}
          </div>

          <div className="table-wrap hidden md:block">
            <table>
              <thead>
                <tr>
                  <th className="text-center">날짜</th>
                  <th className="text-left">건물</th>
                  <th className="text-center">구분</th>
                  <th className="text-left">내용</th>
                  <th className="text-right">금액</th>
                  <th className="text-left">거래처</th>
                  <th className="text-left">증빙</th>
                  <th className="text-center">부담자</th>
                </tr>
              </thead>
              <tbody>
                {report.expenses.slice(0, 50).map((expense, index) => (
                  <tr key={`${expense.date}-${expense.content}-${index}`}>
                    <td className="text-center">{expense.date}</td>
                    <td>{expense.building}</td>
                    <td className="text-center"><StatusBadge tone="default">{repairCategoryText(expense.category)}</StatusBadge></td>
                    <td>{expense.content}</td>
                    <td className="text-right"><MoneyText amount={expense.amount} /></td>
                    <td>{expense.vendor}</td>
                    <td>{expense.evidence}</td>
                    <td className="text-center">{repairPayerText(expense.payer)}</td>
                  </tr>
                ))}
                {report.expenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8">
                      <EmptyState title="선택한 기간의 필요경비 내역이 없습니다." />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {report.expenses.length > 50 ? (
            <p className="mt-2 text-sm text-slate-500">미리보기는 50건까지만 표시됩니다. 전체 자료는 Excel에서 확인하세요.</p>
          ) : null}
        </section>
      </section>
    </>
  );
}
