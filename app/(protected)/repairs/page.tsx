import { createRepair, deleteRepair, updateRepair } from "@/app/actions";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { dateInput, won } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const payerOptions = [
  ["LANDLORD", "임대인"],
  ["TENANT", "임차인"]
];

const categoryOptions = [
  ["REPAIR", "수리비"],
  ["SUPPLIES", "소모품"],
  ["BROKERAGE", "부동산중개비"],
  ["OTHER", "기타"]
];

export default async function RepairsPage() {
  const [adminUser, rooms, repairs] = await Promise.all([
    getCurrentAdminUser(),
    prisma.room.findMany({ orderBy: { roomNumber: "asc" } }),
    prisma.repair.findMany({ include: { room: true }, orderBy: { date: "desc" } })
  ]);
  const isAdmin = adminUser?.role === "ADMIN";

  return (
    <>
      <PageHeader title="수리관리" description="호실별 비용 기록만 관리합니다." />
      <section className="p-8">
        <form action={createRepair} className="mb-6 grid grid-cols-9 gap-3 border border-line bg-white p-4">
          <Field label="호실">
            <select name="roomId">
              {rooms.map((room) => <option key={room.id} value={room.id}>{room.roomNumber}</option>)}
            </select>
          </Field>
          <Field label="날짜"><input name="date" type="date" required defaultValue={dateInput(new Date())} /></Field>
          <Field label="구분">
            <select name="category">
              {categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="항목명"><input name="itemName" required /></Field>
          <Field label="내용"><input name="description" required /></Field>
          <Field label="금액"><input name="amount" type="number" required /></Field>
          <Field label="부담자">
            <select name="payer">
              {payerOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="결제">
            <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
              <input name="isPaid" type="checkbox" className="h-4 w-4" /> 완료
            </label>
          </Field>
          <div className="flex items-end"><button className="button-primary w-full">등록</button></div>
          <Field label="메모"><input name="memo" /></Field>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>호실</th>
                <th>날짜</th>
                <th>구분</th>
                <th>항목명</th>
                <th>내용</th>
                <th>금액</th>
                <th>부담자</th>
                <th>결제여부</th>
                <th>메모</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {repairs.map((repair) => (
                <tr key={repair.id}>
                  <td colSpan={10} className="p-0">
                    <form action={updateRepair} className="grid grid-cols-[90px_135px_130px_130px_1fr_115px_110px_95px_1fr_132px] gap-2 px-3 py-2">
                      <input type="hidden" name="id" value={repair.id} />
                      <select name="roomId" defaultValue={repair.roomId}>
                        {rooms.map((room) => <option key={room.id} value={room.id}>{room.roomNumber}</option>)}
                      </select>
                      <input name="date" type="date" defaultValue={dateInput(repair.date)} required />
                      <select name="category" defaultValue={repair.category}>
                        {categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <input name="itemName" defaultValue={repair.itemName} required />
                      <input name="description" defaultValue={repair.description} required />
                      <input name="amount" type="number" defaultValue={repair.amount} required />
                      <select name="payer" defaultValue={repair.payer}>
                        {payerOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input name="isPaid" type="checkbox" defaultChecked={repair.isPaid} className="h-4 w-4" />
                        {repair.isPaid ? "완료" : "미결제"}
                      </label>
                      <input name="memo" defaultValue={repair.memo ?? ""} />
                      <div className="flex gap-2">
                        <button className="flex-1">수정</button>
                        {isAdmin ? (
                          <button className="button-danger flex-1" formAction={deleteRepair}>삭제</button>
                        ) : null}
                      </div>
                    </form>
                  </td>
                </tr>
              ))}
              {repairs.length === 0 ? (
                <tr><td colSpan={10} className="py-8 text-center text-slate-500">등록된 비용 기록이 없습니다.</td></tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="font-bold">합계</td>
                <td className="font-bold">{won(repairs.reduce((sum, repair) => sum + repair.amount, 0))}</td>
                <td colSpan={4}>
                  임대인 {won(repairs.filter((repair) => repair.payer === "LANDLORD").reduce((sum, repair) => sum + repair.amount, 0))}
                  {" / "}
                  임차인 {won(repairs.filter((repair) => repair.payer === "TENANT").reduce((sum, repair) => sum + repair.amount, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </>
  );
}
