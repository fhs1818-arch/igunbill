"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function QuickRoomSearch({
  className = "",
  placeholder = "호실 / 세입자 / 연락처 검색"
}: {
  className?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className={`grid gap-2 ${className}`}>
      <label className="text-xs font-normal text-slate-500" htmlFor="quick-room-search">
        빠른 검색
      </label>
      <div className="flex items-stretch gap-2">
        <input
          id="quick-room-search"
          className="min-h-11 min-w-0 flex-1 rounded-lg px-3 leading-none"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          type="search"
        />
        <button className="button-primary min-h-11 shrink-0 rounded-lg px-4" type="submit">
          검색
        </button>
      </div>
    </form>
  );
}
