import Link from "next/link";
import { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/PageHeader";
import { AUDIT_ACTIONS } from "@/lib/audit-log";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatKoreanDate(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul"
  }).format(value);
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  return query.toString();
}

export default async function AuditLogsPage({
  searchParams
}: {
  searchParams: Promise<{
    email?: string | string[];
    action?: string | string[];
    date?: string | string[];
    page?: string | string[];
  }>;
}) {
  await requireAdmin();

  const resolvedSearchParams = await searchParams;
  const email = firstParam(resolvedSearchParams.email)?.trim() ?? "";
  const action = firstParam(resolvedSearchParams.action)?.trim() ?? "";
  const date = firstParam(resolvedSearchParams.date)?.trim() ?? "";
  const pageNumber = Math.max(Number(firstParam(resolvedSearchParams.page) ?? "1") || 1, 1);

  const where: Prisma.AuditLogWhereInput = {};

  if (email) {
    where.userEmail = {
      contains: email,
      mode: "insensitive"
    };
  }

  if (action) {
    where.action = action;
  }

  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    const start = new Date(year, month - 1, day);
    const end = new Date(year, month - 1, day + 1);

    where.createdAt = {
      gte: start,
      lt: end
    };
  }

  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNumber - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.auditLog.count({ where })
  ]);

  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
  const prevQuery = buildQuery({ email, action, date, page: pageNumber - 1 });
  const nextQuery = buildQuery({ email, action, date, page: pageNumber + 1 });

  return (
    <>
      <PageHeader title="활동 로그" description="관리자 작업 이력을 최신순으로 확인합니다." />
      <section className="p-8">
        <form className="mb-4 grid grid-cols-[1fr_220px_180px_auto] gap-3 border border-line bg-white p-4">
          <input name="email" placeholder="사용자 이메일" defaultValue={email} />
          <select name="action" defaultValue={action}>
            <option value="">전체 작업</option>
            {Object.values(AUDIT_ACTIONS).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <input name="date" type="date" defaultValue={date} />
          <button className="button-primary" type="submit">
            조회
          </button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>날짜</th>
                <th>사용자</th>
                <th>권한</th>
                <th>작업</th>
                <th>내용</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatKoreanDate(log.createdAt)}</td>
                  <td>{log.userEmail}</td>
                  <td>{log.userRole}</td>
                  <td>{log.action}</td>
                  <td>{log.description}</td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    표시할 활동 로그가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <div>
            총 {totalCount}건 / {pageNumber} / {totalPages} 페이지
          </div>
          <div className="flex gap-2">
            {pageNumber > 1 ? (
              <Link className="button" href={`/audit-logs?${prevQuery}`}>
                이전
              </Link>
            ) : null}
            {pageNumber < totalPages ? (
              <Link className="button" href={`/audit-logs?${nextQuery}`}>
                다음
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
