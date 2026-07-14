export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-6">
      <section className="w-full max-w-md border border-line bg-white p-6 text-center">
        <p className="text-sm font-semibold text-slate-500">OFFLINE</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">인터넷 연결이 필요합니다</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          로그인, 데이터 조회, 저장 작업은 온라인 상태에서만 사용할 수 있습니다.
          연결 상태를 확인한 뒤 다시 시도해주세요.
        </p>
      </section>
    </main>
  );
}
