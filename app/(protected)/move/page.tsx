import { moveOut, updateMoveOutDate } from "@/app/actions";
import { PageHeader } from "@/components/PageHeader";
import { dateInput, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function contractNotice(moveOutDate: string | null) {
  if (!moveOutDate) return { daysLeft: null, label: "-" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(moveOutDate);
  target.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { daysLeft, label: "계약만료" };
  if (daysLeft <= 60) return { daysLeft, label: "퇴실예정 60일 이내" };
  return { daysLeft, label: "-" };
}

function roomStatusLabel(status: string) {
  return {
    VACANT: "공실",
    OCCUPIED: "입주중",
    MOVE_OUT_SOON: "퇴실예정"
  }[status] ?? status;
}

function NoticeBadge({ label }: { label: string }) {
  if (label === "-") return <span className="text-slate-400">-</span>;
  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-bold ${label === "계약만료" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
      {label}
    </span>
  );
}

export default async function MovePage() {
  const rooms = await prisma.room.findMany({ orderBy: { roomNumber: "asc" } });

  return (
    <>
      <PageHeader title="퇴실관리" description="퇴실예정 60일 알림, 퇴실일 수정, 퇴실처리만 관리합니다." />
      <section className="p-3 pb-24 sm:p-4 md:p-8 md:pb-8">
        <div className="grid gap-3 md:hidden">
          {rooms.map((room) => {
            const notice = contractNotice(room.moveOutDate);
            return (
              <form key={room.id} action={updateMoveOutDate} className="border border-line bg-white p-4">
                <input type="hidden" name="roomId" value={room.id} />
                <input type="hidden" name="memo" value={room.memo ?? ""} />
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-bold text-ink">{room.roomNumber}</p>
                    <p className="mt-1 text-sm text-slate-600">{room.tenantName ?? "-"}</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {roomStatusLabel(room.status)}
                  </span>
                </div>

                <div className="grid gap-2 text-sm text-slate-700">
                  <div className="flex justify-between gap-3"><span>연락처</span><span>{room.tenantPhone ?? "-"}</span></div>
                  <div className="flex justify-between gap-3"><span>보증금</span><span className="font-semibold">{won(room.deposit)}</span></div>
                  <div className="flex justify-between gap-3"><span>월세</span><span className="font-semibold">{won(room.monthlyRent)}</span></div>
                  <div className="flex justify-between gap-3"><span>입실일</span><span>{dateInput(room.moveInDate) || "-"}</span></div>
                  <div className="flex justify-between gap-3"><span>퇴실일</span><span>{dateInput(room.moveOutDate) || "-"}</span></div>
                  <div className="flex justify-between gap-3"><span>남은일수</span><span className={notice.daysLeft !== null && notice.daysLeft <= 60 ? "font-bold text-red-700" : ""}>{notice.daysLeft === null ? "-" : `${notice.daysLeft}일`}</span></div>
                  <div className="flex items-center justify-between gap-3"><span>알림</span><NoticeBadge label={notice.label} /></div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <label className="grid gap-1 text-xs font-semibold text-slate-500">
                    퇴실날짜
                    <input name="moveOutDate" type="date" defaultValue={dateInput(room.moveOutDate)} />
                  </label>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button type="submit">퇴실일 수정</button>
                  {room.status === "VACANT" ? (
                    <span className="py-2 text-center text-sm text-slate-400">공실</span>
                  ) : (
                    <button className="button-danger" formAction={moveOut}>퇴실처리</button>
                  )}
                </div>
              </form>
            );
          })}
          {rooms.length === 0 ? (
            <div className="border border-line bg-white p-6 text-center text-sm text-slate-500">등록된 호실이 없습니다.</div>
          ) : null}
        </div>

        <div className="table-wrap hidden md:block">
          <table>
            <thead>
              <tr>
                <th>호실</th>
                <th>임차인</th>
                <th>연락처</th>
                <th>상태</th>
                <th>보증금</th>
                <th>월세</th>
                <th>입실날짜</th>
                <th>퇴실날짜</th>
                <th>남은일수</th>
                <th>알림</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => {
                const notice = contractNotice(room.moveOutDate);
                return (
                  <tr key={room.id}>
                    <td colSpan={11} className="p-0">
                      <form action={updateMoveOutDate} className="grid grid-cols-[80px_120px_140px_105px_110px_100px_130px_130px_100px_150px_190px] gap-2 px-3 py-2">
                        <input type="hidden" name="roomId" value={room.id} />
                        <input type="hidden" name="memo" value={room.memo ?? ""} />
                        <div className="py-2 font-bold">{room.roomNumber}</div>
                        <div className="py-2">{room.tenantName ?? "-"}</div>
                        <div className="py-2">{room.tenantPhone ?? "-"}</div>
                        <div className="py-2">{roomStatusLabel(room.status)}</div>
                        <div className="py-2">{won(room.deposit)}</div>
                        <div className="py-2">{won(room.monthlyRent)}</div>
                        <div className="py-2">{dateInput(room.moveInDate) || "-"}</div>
                        <input name="moveOutDate" type="date" defaultValue={dateInput(room.moveOutDate)} />
                        <div className={notice.daysLeft !== null && notice.daysLeft <= 60 ? "py-2 font-bold text-red-700" : "py-2"}>
                          {notice.daysLeft === null ? "-" : `${notice.daysLeft}일`}
                        </div>
                        <div className="py-1.5">
                          <NoticeBadge label={notice.label} />
                        </div>
                        <div className="flex gap-2">
                          <button className="flex-1" type="submit">퇴실일 수정</button>
                          {room.status === "VACANT" ? (
                            <span className="flex-1 py-2 text-center text-sm text-slate-400">공실</span>
                          ) : (
                            <button className="button-danger flex-1" formAction={moveOut}>퇴실처리</button>
                          )}
                        </div>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {rooms.length === 0 ? (
                <tr><td colSpan={11} className="py-8 text-center text-slate-500">등록된 호실이 없습니다.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
