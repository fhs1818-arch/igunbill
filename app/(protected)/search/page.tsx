import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { roomStatusLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = firstParam(resolvedSearchParams.q)?.trim() ?? "";
  const lowerQuery = query.toLowerCase();
  const digitQuery = digitsOnly(query);

  const rooms = query
    ? await prisma.room.findMany({
        orderBy: { roomNumber: "asc" },
        select: {
          id: true,
          roomNumber: true,
          tenantName: true,
          tenantPhone: true,
          status: true
        }
      })
    : [];

  const results = rooms
    .filter((room) => {
      const phoneDigits = digitsOnly(room.tenantPhone ?? "");

      return (
        normalized(room.roomNumber).includes(lowerQuery) ||
        normalized(room.tenantName).includes(lowerQuery) ||
        normalized(room.tenantPhone).includes(lowerQuery) ||
        (digitQuery.length > 0 && phoneDigits.includes(digitQuery))
      );
    })
    .slice(0, 20);

  return (
    <>
      <PageHeader title="빠른 검색" description="호실번호, 세입자 이름, 전화번호로 호실을 찾습니다." />
      <section className="p-4 md:p-8">
        {!query ? (
          <div className="border border-line bg-white p-6 text-sm text-slate-500">
            검색어를 입력한 뒤 검색 버튼을 눌러주세요.
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <div>
                검색어 <span className="font-semibold text-ink">"{query}"</span> 결과 {results.length}건
              </div>
              <div>최대 20건까지 표시됩니다.</div>
            </div>

            <div className="hidden border border-line bg-white md:block">
              <div className="grid grid-cols-[120px_1fr_180px_120px] border-b border-line bg-slate-50 px-3 py-3 text-xs font-bold uppercase text-slate-500">
                <div>호실번호</div>
                <div>세입자 이름</div>
                <div>전화번호</div>
                <div>입주 상태</div>
              </div>
              <div>
                {results.map((room) => (
                  <Link
                    key={room.id}
                    className="grid grid-cols-[120px_1fr_180px_120px] border-b border-slate-100 px-3 py-3 text-sm transition last:border-b-0 hover:bg-amber-50"
                    href={`/rooms#room-${room.id}`}
                  >
                    <div className="font-semibold text-ink">{room.roomNumber}</div>
                    <div>{room.tenantName || "-"}</div>
                    <div>{room.tenantPhone || "-"}</div>
                    <div>{roomStatusLabel(room.status)}</div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:hidden">
              {results.map((room) => (
                <Link
                  key={room.id}
                  className="border border-line bg-white p-4 transition hover:bg-amber-50"
                  href={`/rooms#room-${room.id}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-lg font-bold text-ink">{room.roomNumber}</div>
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {roomStatusLabel(room.status)}
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-slate-700">
                    <div>세입자명: {room.tenantName || "-"}</div>
                    <div className="mt-1">전화번호: {room.tenantPhone || "-"}</div>
                  </div>
                </Link>
              ))}
            </div>

            {results.length === 0 ? (
              <div className="border border-line bg-white p-6 text-center text-sm text-slate-500">
                검색 결과가 없습니다.
              </div>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}
