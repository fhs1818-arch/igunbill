import type { RepairCategory, RepairPayer } from "@prisma/client";
import { createRepair, deleteRepair, updateRepair } from "@/app/actions";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { ActionButton } from "@/components/ui/ActionButton";
import { AppCard } from "@/components/ui/AppCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/ui/MoneyText";
import { Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { dateInput } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const payerOptions: Array<[RepairPayer, string]> = [
  ["LANDLORD", "임대인"],
  ["TENANT", "임차인"]
];

const categoryOptions: Array<[RepairCategory, string]> = [
  ["REPAIR", "수리비"],
  ["SUPPLIES", "소모품"],
  ["BROKERAGE", "부동산중개비"],
  ["OTHER", "기타"]
];

function optionLabel<T extends string>(options: Array<[T, string]>, value: T) {
  return options.find(([optionValue]) => optionValue === value)?.[1] ?? value;
}

function paidTone(isPaid: boolean) {
  return isPaid ? "positive" : "warning";
}

function payerTone(payer: RepairPayer) {
  return payer === "LANDLORD" ? "brand" : "default";
}

function RepairCreateFields({ rooms }: { rooms: Array<{ id: number; roomNumber: string }> }) {
  return (
    <>
      <Field label="호실">
        <select name="roomId">
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.roomNumber}
            </option>
          ))}
        </select>
      </Field>
      <Field label="날짜">
        <input name="date" type="date" required defaultValue={dateInput(new Date())} />
      </Field>
      <Field label="구분">
        <select name="category">
          {categoryOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="항목명">
        <input name="itemName" required />
      </Field>
      <Field label="내용">
        <input name="description" required />
      </Field>
      <Field label="금액">
        <input name="amount" type="number" required />
      </Field>
      <Field label="부담자">
        <select name="payer">
          {payerOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="결제">
        <label className="flex h-10 items-center gap-2 text-sm font-semibold text-slate-700">
          <input name="isPaid" type="checkbox" className="h-4 w-4" /> 완료
        </label>
      </Field>
      <Field label="메모">
        <input name="memo" />
      </Field>
    </>
  );
}

export default async function RepairsPage() {
  const [adminUser, rooms, repairs] = await Promise.all([
    getCurrentAdminUser(),
    prisma.room.findMany({ orderBy: { roomNumber: "asc" } }),
    prisma.repair.findMany({ include: { room: true }, orderBy: { date: "desc" } })
  ]);
  const isAdmin = adminUser?.role === "ADMIN";

  return (
    <>
      <PageHeader title="수리관리" description="호실별 수리비와 관리 비용을 기록합니다." />
      <section className="space-y-4 p-4 pb-24 md:p-8 md:pb-8">
        <details className="md:hidden">
          <summary className="cursor-pointer list-none">
            <AppCard className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-ink">수리 내역 등록</p>
                  <p className="mt-1 text-sm text-slate-500">새 비용 기록을 추가합니다.</p>
                </div>
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">등록하기</span>
              </div>
            </AppCard>
          </summary>
          <AppCard className="mt-3">
            <form action={createRepair} className="grid grid-cols-1 gap-3">
              <RepairCreateFields rooms={rooms} />
              <ActionButton className="w-full" type="submit" variant="primary">
                등록
              </ActionButton>
            </form>
          </AppCard>
        </details>

        <Section className="hidden md:block" title="수리 내역 등록" description="호실, 비용 구분, 부담자를 입력해 기록합니다.">
          <form action={createRepair} className="grid grid-cols-9 gap-3">
            <RepairCreateFields rooms={rooms} />
            <div className="flex items-end">
              <ActionButton className="w-full" type="submit" variant="primary">
                등록
              </ActionButton>
            </div>
          </form>
        </Section>

        <div className="grid gap-3 md:hidden">
          {repairs.map((repair) => (
            <form key={repair.id} action={updateRepair}>
              <input type="hidden" name="id" value={repair.id} />
              <AppCard>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone="default">{optionLabel(categoryOptions, repair.category)}</StatusBadge>
                      <p className="text-xl font-bold text-ink">{repair.room.roomNumber}</p>
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold text-slate-600">{repair.itemName}</p>
                  </div>
                  <StatusBadge tone={paidTone(repair.isPaid)}>{repair.isPaid ? "결제완료" : "미결제"}</StatusBadge>
                </div>

                <div className="mt-4 rounded-lg bg-slate-50 p-4 text-center">
                  <p className="text-xs font-bold text-slate-500">금액</p>
                  <MoneyText amount={repair.amount} className="mt-1 text-4xl" />
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-700">
                  <div className="flex justify-between gap-3">
                    <span className="shrink-0 text-slate-500">날짜</span>
                    <span className="font-semibold">{dateInput(repair.date)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="shrink-0 text-slate-500">내용</span>
                    <span className="min-w-0 break-words text-right font-semibold">{repair.description}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="shrink-0 text-slate-500">부담자</span>
                    <StatusBadge tone={payerTone(repair.payer)}>{optionLabel(payerOptions, repair.payer)}</StatusBadge>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="shrink-0 text-slate-500">비고</span>
                    <span className="min-w-0 break-words text-right font-semibold">{repair.memo || "-"}</span>
                  </div>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                    상세 수정
                  </summary>
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <Field label="호실">
                      <select name="roomId" defaultValue={repair.roomId}>
                        {rooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.roomNumber}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="날짜">
                      <input name="date" type="date" defaultValue={dateInput(repair.date)} required />
                    </Field>
                    <Field label="구분">
                      <select name="category" defaultValue={repair.category}>
                        {categoryOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="항목명">
                      <input name="itemName" defaultValue={repair.itemName} required />
                    </Field>
                    <Field label="내용">
                      <input name="description" defaultValue={repair.description} required />
                    </Field>
                    <Field label="금액">
                      <input name="amount" type="number" defaultValue={repair.amount} required />
                    </Field>
                    <Field label="부담자">
                      <select name="payer" defaultValue={repair.payer}>
                        {payerOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input name="isPaid" type="checkbox" defaultChecked={repair.isPaid} className="h-4 w-4" />
                      결제 완료
                    </label>
                    <Field label="메모">
                      <input name="memo" defaultValue={repair.memo ?? ""} />
                    </Field>
                  </div>
                </details>

                <div className={`mt-4 grid gap-2 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
                  <ActionButton type="submit">수정</ActionButton>
                  {isAdmin ? (
                    <ActionButton formAction={deleteRepair} variant="danger">
                      삭제
                    </ActionButton>
                  ) : null}
                </div>
              </AppCard>
            </form>
          ))}
          {repairs.length === 0 ? <EmptyState title="등록된 수리 내역이 없습니다." /> : null}
        </div>

        <Section className="hidden md:block" title="수리 내역" description="등록된 비용 기록을 표에서 바로 수정할 수 있습니다.">
          <div className="table-wrap rounded-lg">
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
                  <tr key={repair.id} className="transition-colors hover:bg-slate-50">
                    <td colSpan={10} className="p-0">
                      <form
                        action={updateRepair}
                        className="grid grid-cols-[90px_135px_130px_130px_1fr_120px_120px_110px_1fr_150px] gap-2 px-3 py-3"
                      >
                        <input type="hidden" name="id" value={repair.id} />
                        <select name="roomId" defaultValue={repair.roomId}>
                          {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.roomNumber}
                            </option>
                          ))}
                        </select>
                        <input name="date" type="date" defaultValue={dateInput(repair.date)} required />
                        <select name="category" defaultValue={repair.category}>
                          {categoryOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <input name="itemName" defaultValue={repair.itemName} required />
                        <input name="description" defaultValue={repair.description} required />
                        <div className="flex items-center gap-2">
                          <input className="min-w-0" name="amount" type="number" defaultValue={repair.amount} required />
                        </div>
                        <div className="flex items-center">
                          <select name="payer" defaultValue={repair.payer}>
                            {payerOptions.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input name="isPaid" type="checkbox" defaultChecked={repair.isPaid} className="h-4 w-4" />
                          <StatusBadge tone={paidTone(repair.isPaid)}>{repair.isPaid ? "완료" : "미결제"}</StatusBadge>
                        </label>
                        <input name="memo" defaultValue={repair.memo ?? ""} />
                        <div className="flex gap-2">
                          <ActionButton className="flex-1" type="submit">
                            수정
                          </ActionButton>
                          {isAdmin ? (
                            <ActionButton className="flex-1" formAction={deleteRepair} variant="danger">
                              삭제
                            </ActionButton>
                          ) : null}
                        </div>
                      </form>
                    </td>
                  </tr>
                ))}
                {repairs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8">
                      <EmptyState title="등록된 수리 내역이 없습니다." />
                    </td>
                  </tr>
                ) : null}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="font-bold">
                    합계
                  </td>
                  <td className="font-bold">
                    <MoneyText amount={repairs.reduce((sum, repair) => sum + repair.amount, 0)} />
                  </td>
                  <td colSpan={4} className="text-sm text-slate-600">
                    임대인 부담{" "}
                    <MoneyText
                      amount={repairs.filter((repair) => repair.payer === "LANDLORD").reduce((sum, repair) => sum + repair.amount, 0)}
                    />
                    {" / "}
                    임차인 부담{" "}
                    <MoneyText
                      amount={repairs.filter((repair) => repair.payer === "TENANT").reduce((sum, repair) => sum + repair.amount, 0)}
                    />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Section>
      </section>
    </>
  );
}
