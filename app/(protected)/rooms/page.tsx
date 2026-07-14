import { RoomStatus } from "@prisma/client";
import { createRoom, deleteRoom, updateRoom } from "@/app/actions";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { RoomHashHighlighter } from "@/components/RoomHashHighlighter";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { dateInput, roomStatusLabel, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusOptions: Array<[RoomStatus, string]> = [
  ["VACANT", "공실"],
  ["OCCUPIED", "입주중"],
  ["MOVE_OUT_SOON", "퇴실예정"]
];

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
      <section className="p-8">
        <form action={createRoom} className="mb-6 grid grid-cols-10 gap-3 border border-line bg-white p-4">
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
          <div className="flex items-end">
            <button className="button-primary w-full" type="submit">등록</button>
          </div>
          <Field label="메모"><input name="memo" /></Field>
        </form>

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
                <th>납부일</th>
                <th>입실날짜</th>
                <th>퇴실날짜</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} id={`room-${room.id}`} className="transition-colors">
                  <td colSpan={10} className="p-0">
                    <form action={updateRoom} className="grid grid-cols-[85px_120px_140px_105px_110px_100px_85px_130px_130px_135px] gap-2 px-3 py-2">
                      <input type="hidden" name="id" value={room.id} />
                      <input name="roomNumber" defaultValue={room.roomNumber} required />
                      <input name="tenantName" defaultValue={room.tenantName ?? ""} />
                      <input name="tenantPhone" defaultValue={room.tenantPhone ?? ""} />
                      <select name="status" defaultValue={room.status}>
                        {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <input name="deposit" type="number" defaultValue={room.deposit} aria-label={`보증금 ${won(room.deposit)}`} />
                      <input name="monthlyRent" type="number" defaultValue={room.monthlyRent} />
                      <input name="rentDueDay" type="number" min={1} max={31} defaultValue={room.rentDueDay} />
                      <input name="moveInDate" type="date" defaultValue={dateInput(room.moveInDate)} />
                      <input name="moveOutDate" type="date" defaultValue={dateInput(room.moveOutDate)} />
                      <div className="flex gap-2">
                        <button className="flex-1" type="submit">수정</button>
                        {isAdmin ? (
                          <button className="button-danger flex-1" formAction={deleteRoom}>삭제</button>
                        ) : null}
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
        <div className="mt-3 text-sm text-slate-500">
          상태: {statusOptions.map(([value]) => roomStatusLabel(value)).join(" / ")}
        </div>
      </section>
    </>
  );
}
