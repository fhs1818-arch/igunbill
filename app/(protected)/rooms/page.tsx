import { RoomStatus } from "@prisma/client";
import { createRoom, deleteRoom, updateRoom } from "@/app/actions";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { QuickRoomSearch } from "@/components/QuickRoomSearch";
import { RoomHashHighlighter } from "@/components/RoomHashHighlighter";
import { ActionButton, ActionLink } from "@/components/ui/ActionButton";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { dateInput, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusOptions: Array<[RoomStatus, string]> = [
  ["VACANT", "공실"],
  ["OCCUPIED", "입주중"],
  ["MOVE_OUT_SOON", "퇴실예정"]
];

function roomStatusLabel(status: RoomStatus) {
  return statusOptions.find(([value]) => value === status)?.[1] ?? status;
}

function roomStatusTone(status: RoomStatus) {
  return {
    VACANT: "default",
    OCCUPIED: "positive",
    MOVE_OUT_SOON: "warning"
  }[status] as "default" | "positive" | "warning";
}

function RoomCreateFields() {
  return (
    <>
      <Field label="호실"><input name="roomNumber" required placeholder="101" /></Field>
      <Field label="임차인"><input name="tenantName" /></Field>
      <Field label="연락처"><input name="tenantPhone" placeholder="010-0000-0000" /></Field>
      <Field label="상태">
        <select name="status" defaultValue="VACANT">
          {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <Field label="보증금"><input name="deposit" type="number" /></Field>
      <Field label="월세"><input name="monthlyRent" type="number" /></Field>
      <Field label="납부일"><input name="rentDueDay" type="number" min={1} max={31} defaultValue={5} /></Field>
      <Field label="입실날짜"><input name="moveInDate" type="date" /></Field>
      <Field label="퇴실날짜"><input name="moveOutDate" type="date" /></Field>
      <Field label="메모"><input name="memo" /></Field>
    </>
  );
}

function RoomEditFields({ room }: { room: Awaited<ReturnType<typeof prisma.room.findMany>>[number] }) {
  return (
    <>
      <Field label="호실"><input name="roomNumber" defaultValue={room.roomNumber} required /></Field>
      <Field label="임차인"><input name="tenantName" defaultValue={room.tenantName ?? ""} /></Field>
      <Field label="연락처"><input name="tenantPhone" defaultValue={room.tenantPhone ?? ""} /></Field>
      <Field label="상태">
        <select name="status" defaultValue={room.status}>
          {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <Field label="보증금"><input name="deposit" type="number" defaultValue={room.deposit} /></Field>
      <Field label="월세"><input name="monthlyRent" type="number" defaultValue={room.monthlyRent} /></Field>
      <Field label="납부일"><input name="rentDueDay" type="number" min={1} max={31} defaultValue={room.rentDueDay} /></Field>
      <Field label="입실날짜"><input name="moveInDate" type="date" defaultValue={dateInput(room.moveInDate)} /></Field>
      <Field label="퇴실날짜"><input name="moveOutDate" type="date" defaultValue={dateInput(room.moveOutDate)} /></Field>
      <Field label="메모"><input name="memo" defaultValue={room.memo ?? ""} /></Field>
    </>
  );
}

export default async function RoomsPage() {
  const [adminUser, rooms] = await Promise.all([
    getCurrentAdminUser(),
    prisma.room.findMany({ orderBy: { roomNumber: "asc" } })
  ]);
  const isAdmin = adminUser?.role === "ADMIN";

  return (
    <>
      <RoomHashHighlighter />
      <PageHeader title="호실관리" description="호실관리 데이터가 월세입금관리의 원본입니다." />
      <section className="space-y-4 p-4 pb-24 md:p-8 md:pb-8">
        <Section title="호실 검색" description="호실번호, 세입자 이름, 연락처로 빠르게 찾습니다.">
          <QuickRoomSearch placeholder="호실 / 세입자 / 연락처 검색" />
        </Section>

        <details className="md:hidden">
          <summary className="mb-3 cursor-pointer rounded-lg border border-line bg-white p-4 text-sm font-bold text-ink shadow-sm shadow-slate-200/40">
            등록하기
          </summary>
          <AppCard>
            <form action={createRoom} className="grid grid-cols-1 gap-3">
              <RoomCreateFields />
              <ActionButton className="w-full" type="submit" variant="primary">등록</ActionButton>
            </form>
          </AppCard>
        </details>

        <AppCard className="hidden md:block">
          <form action={createRoom} className="grid grid-cols-5 gap-3 xl:grid-cols-10">
            <RoomCreateFields />
            <div className="flex items-end">
              <ActionButton className="w-full" type="submit" variant="primary">등록</ActionButton>
            </div>
          </form>
        </AppCard>

        <div className="grid gap-3 md:hidden">
          {rooms.map((room) => (
            <form key={room.id} action={updateRoom} id={`room-${room.id}`} className="transition-colors">
              <input type="hidden" name="id" value={room.id} />
              <AppCard>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-3xl font-bold text-ink">{room.roomNumber}</p>
                    <p className="mt-1 truncate text-base font-semibold text-slate-700">{room.tenantName || "-"}</p>
                  </div>
                  <StatusBadge tone={roomStatusTone(room.status)}>{roomStatusLabel(room.status)}</StatusBadge>
                </div>

                <div className="grid gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">보증금</span>
                    <span className="font-bold text-ink">{won(room.deposit)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">월세</span>
                    <span className="font-bold text-ink">{won(room.monthlyRent)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">납부일</span>
                    <span className="font-bold text-ink">매월 {room.rentDueDay}일</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">전화번호</span>
                    <span className="break-words text-right font-semibold text-slate-700">{room.tenantPhone || "-"}</span>
                  </div>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-bold text-slate-600">상세 수정</summary>
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <RoomEditFields room={room} />
                    {isAdmin ? (
                      <ActionButton className="w-full" formAction={deleteRoom} variant="danger">
                        삭제
                      </ActionButton>
                    ) : null}
                  </div>
                </details>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <ActionButton type="submit" variant="primary">수정</ActionButton>
                  <ActionLink href="/payments">월세</ActionLink>
                  <ActionLink href="/move">퇴실</ActionLink>
                </div>
              </AppCard>
            </form>
          ))}
          {rooms.length === 0 ? (
            <EmptyState title="등록된 호실이 없습니다." description="등록하기 버튼으로 첫 호실을 추가해보세요." />
          ) : null}
        </div>

        <div className="table-wrap hidden rounded-lg md:block">
          <table>
            <thead>
              <tr>
                <th>호실</th>
                <th>임차인</th>
                <th>연락처</th>
                <th>상태</th>
                <th>보증금</th>
                <th>월세</th>
                <th>납부일</th>
                <th>입실날짜</th>
                <th>퇴실날짜</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} id={`room-${room.id}`} className="transition-colors hover:bg-slate-50">
                  <td colSpan={10} className="p-0">
                    <form action={updateRoom} className="grid grid-cols-[85px_120px_140px_125px_110px_100px_85px_130px_130px_150px] gap-2 px-3 py-3">
                      <input type="hidden" name="id" value={room.id} />
                      <input name="roomNumber" defaultValue={room.roomNumber} required />
                      <input name="tenantName" defaultValue={room.tenantName ?? ""} />
                      <input name="tenantPhone" defaultValue={room.tenantPhone ?? ""} />
                      <div className="grid gap-1">
                        <StatusBadge className="justify-center" tone={roomStatusTone(room.status)}>
                          {roomStatusLabel(room.status)}
                        </StatusBadge>
                        <select name="status" defaultValue={room.status}>
                          {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </div>
                      <input name="deposit" type="number" defaultValue={room.deposit} aria-label={`보증금 ${won(room.deposit)}`} />
                      <input name="monthlyRent" type="number" defaultValue={room.monthlyRent} />
                      <input name="rentDueDay" type="number" min={1} max={31} defaultValue={room.rentDueDay} />
                      <input name="moveInDate" type="date" defaultValue={dateInput(room.moveInDate)} />
                      <input name="moveOutDate" type="date" defaultValue={dateInput(room.moveOutDate)} />
                      <div className="flex gap-2">
                        <ActionButton className="flex-1" type="submit">수정</ActionButton>
                        {isAdmin ? <ActionButton className="flex-1" formAction={deleteRoom} variant="danger">삭제</ActionButton> : null}
                      </div>
                    </form>
                  </td>
                </tr>
              ))}
              {rooms.length === 0 ? (
                <tr><td colSpan={10} className="py-8 text-center text-slate-500">등록된 호실이 없습니다.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="text-sm text-slate-500">
          상태: {statusOptions.map(([, label]) => label).join(" / ")}
        </div>
      </section>
    </>
  );
}
