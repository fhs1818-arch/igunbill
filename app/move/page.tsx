import { moveOut, updateMoveOutDate } from "@/app/actions";
import { PageHeader } from "@/components/PageHeader";
import { dateInput, roomStatusLabel, won } from "@/lib/format";
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

export default async function MovePage() {
  const rooms = await prisma.room.findMany({ orderBy: { roomNumber: "asc" } });

  return (
    <>
      <PageHeader title="퇴실관리" description="퇴실예정 60일 알림, 퇴실일 수정, 퇴실처리만 관리합니다." />
      <section className="p-8">
        <div className="table-wrap">
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
                          {notice.label === "-" ? (
                            <span className="text-slate-400">-</span>
                          ) : (
                            <span className={`rounded-full border px-2 py-1 text-xs font-bold ${notice.label === "계약만료" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                              {notice.label}
                            </span>
                          )}
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
