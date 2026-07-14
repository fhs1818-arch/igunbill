export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6">
      <section className="w-full max-w-md border border-line bg-white p-8 text-center">
        <p className="text-xs font-semibold text-slate-500">RENTAL MANAGER</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">접근 권한이 없습니다</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          로그인은 완료되었지만 이건빌 관리자 목록에 등록된 계정이 아닙니다.
        </p>
      </section>
    </main>
  );
}
