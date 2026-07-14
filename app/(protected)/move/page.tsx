import type { RoomStatus } from "@prisma/client";
import { moveOut, updateMoveOutDate } from "@/app/actions";
import { PageHeader } from "@/components/PageHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { dateInput } from "@/lib/format";
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

function roomStatusLabel(status: RoomStatus) {
  return {
    VACANT: "공실",
    OCCUPIED: "입주중",
    MOVE_OUT_SOON: "퇴실예정"
  }[status];
}

function moveStatus(room: { status: RoomStatus; moveOutDate: string | null }) {
  if (room.status === "VACANT") return { label: "퇴실완료", tone: "positive" as const };
  if (room.status === "MOVE_OUT_SOON" || room.moveOutDate) return { label: "퇴실예정", tone: "warning" as const };
  return { label: "취소", tone: "default" as const };
}

function NoticeBadge({ label }: { label: string }) {
  if (label === "-") return <span className="text-slate-400">-</span>;
  return <StatusBadge tone={label === "계약만료" ? "negative" : "warning"}>{label}</StatusBadge>;
}

export default async function MovePage() {
  const rooms = await prisma.room.findMany({ orderBy: { roomNumber: "asc" } });

  return (
    <>
      <PageHeader title="퇴실관리" description="퇴실예정 60일 알림, 퇴실일 수정, 퇴실처리를 관리합니다." />
      <section className="space-y-4 p-4 pb-24 md:p-8 md:pb-8">
        <div className="grid gap-3 md:hidden">
          {rooms.map((room) => {
            const notice = contractNotice(room.moveOutDate);
            const status = moveStatus(room);
            return (
              <form key={room.id} action={updateMoveOutDate}>
                <input type="hidden" name="roomId" value={room.id} />
                <input type="hidden" name="memo" value={room.memo ?? ""} />
                <AppCard>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-2xl font-bold text-ink">{room.roomNumber}</p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-600">{room.tenantName ?? "-"}</p>
                    </div>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-500">보증금</p>
                      <MoneyText amount={room.deposit} className="mt-1 block text-xl" />
                    </div>
                    <div className="rounded-lg bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-500">월세</p>
                      <MoneyText amount={room.monthlyRent} className="mt-1 block text-xl" />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-slate-700">
                    <div className="flex justify-between gap-3">
                      <span className="shrink-0 text-slate-500">연락처</span>
                      <span className="min-w-0 break-words text-right font-semibold">{room.tenantPhone ?? "-"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="shrink-0 text-slate-500">입실일</span>
                      <span className="font-semibold">{dateInput(room.moveInDate) || "-"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="shrink-0 text-slate-500">퇴실예정일</span>
                      <span className="font-semibold">{dateInput(room.moveOutDate) || "-"}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="shrink-0 text-slate-500">남은일수</span>
                      <span className={notice.daysLeft !== null && notice.daysLeft <= 60 ? "font-bold text-red-700" : "font-semibold"}>
                        {notice.daysLeft === null ? "-" : `${notice.daysLeft}일`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="shrink-0 text-slate-500">알림</span>
                      <NoticeBadge label={notice.label} />
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="shrink-0 text-slate-500">메모</span>
                      <span className="min-w-0 break-words text-right font-semibold">{room.memo || "-"}</span>
                    </div>
                  </div>

                  <label className="mt-4 grid gap-1 text-xs font-semibold text-slate-500">
                    퇴실일
                    <input name="moveOutDate" type="date" defaultValue={dateInput(room.moveOutDate)} />
                  </label>

                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <ActionButton type="submit">수정</ActionButton>
                    {room.status === "VACANT" ? (
                      <div className="flex min-h-10 items-center justify-center rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-400">
                        퇴실완료
                      </div>
                    ) : (
                      <ActionButton formAction={moveOut} variant="danger">
                        퇴실완료
                      </ActionButton>
                    )}
                  </div>
                </AppCard>
              </form>
            );
          })}
          {rooms.length === 0 ? <EmptyState title="등록된 퇴실 내역이 없습니다." /> : null}
        </div>

        <Section className="hidden md:block" title="퇴실 목록" description="퇴실일을 수정하거나 퇴실완료 처리할 수 있습니다.">
          <div className="table-wrap rounded-lg">
            <table>
              <thead>
                <tr>
                  <th>호실</th>
                  <th>임차인</th>
                  <th>연락처</th>
                  <th>퇴실상태</th>
                  <th>현재상태</th>
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
                  const status = moveStatus(room);
                  return (
                    <tr key={room.id} className="transition-colors hover:bg-slate-50">
                      <td colSpan={12} className="p-0">
                        <form
                          action={updateMoveOutDate}
                          className="grid grid-cols-[80px_120px_140px_105px_105px_115px_105px_130px_130px_100px_150px_170px] gap-2 px-3 py-3"
                        >
                          <input type="hidden" name="roomId" value={room.id} />
                          <input type="hidden" name="memo" value={room.memo ?? ""} />
                          <div className="py-2 font-bold text-ink">{room.roomNumber}</div>
                          <div className="py-2 text-slate-700">{room.tenantName ?? "-"}</div>
                          <div className="py-2 text-slate-700">{room.tenantPhone ?? "-"}</div>
                          <div className="py-1.5">
                            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                          </div>
                          <div className="py-1.5">
                            <StatusBadge tone={room.status === "VACANT" ? "default" : room.status === "MOVE_OUT_SOON" ? "warning" : "positive"}>
                              {roomStatusLabel(room.status)}
                            </StatusBadge>
                          </div>
                          <div className="py-2">
                            <MoneyText amount={room.deposit} />
                          </div>
                          <div className="py-2">
                            <MoneyText amount={room.monthlyRent} />
                          </div>
                          <div className="py-2 text-slate-700">{dateInput(room.moveInDate) || "-"}</div>
                          <input name="moveOutDate" type="date" defaultValue={dateInput(room.moveOutDate)} />
                          <div className={notice.daysLeft !== null && notice.daysLeft <= 60 ? "py-2 font-bold text-red-700" : "py-2 text-slate-700"}>
                            {notice.daysLeft === null ? "-" : `${notice.daysLeft}일`}
                          </div>
                          <div className="py-1.5">
                            <NoticeBadge label={notice.label} />
                          </div>
                          <div className="flex gap-2">
                            <ActionButton className="flex-1" type="submit">
                              수정
                            </ActionButton>
                            {room.status === "VACANT" ? (
                              <div className="flex flex-1 items-center justify-center rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-400">
                                완료
                              </div>
                            ) : (
                              <ActionButton className="flex-1" formAction={moveOut} variant="danger">
                                퇴실완료
                              </ActionButton>
                            )}
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {rooms.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8">
                      <EmptyState title="등록된 퇴실 내역이 없습니다." />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Section>
      </section>
    </>
  );
}
