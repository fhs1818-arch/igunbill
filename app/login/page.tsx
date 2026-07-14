"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsPending(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setIsPending(false);

    if (error) {
      setErrorMessage("이메일 또는 비밀번호를 확인해 주세요.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6">
      <section className="w-full max-w-sm border border-line bg-white p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-500">RENTAL MANAGER</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">이건빌 관리자 로그인</h1>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">이메일</span>
            <input
              autoComplete="email"
              className="w-full"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">비밀번호</span>
            <input
              autoComplete="current-password"
              className="w-full"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {errorMessage ? (
            <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button className="button-primary w-full" disabled={isPending} type="submit">
            {isPending ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </section>
    </main>
  );
}
