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
    <form onSubmit={handleSubmit} className={`grid w-full min-w-0 max-w-full gap-2 overflow-hidden ${className}`}>
      <label className="truncate text-xs font-normal text-slate-500" htmlFor="quick-room-search">
        빠른 검색
      </label>
      <div className="flex w-full min-w-0 max-w-full items-stretch gap-2 overflow-hidden">
        <input
          id="quick-room-search"
          className="box-border min-h-11 w-full min-w-0 flex-1 rounded-lg px-3 leading-none"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          type="search"
        />
        <button className="button-primary min-h-11 w-auto shrink-0 rounded-lg px-3" type="submit">
          검색
        </button>
      </div>
    </form>
  );
}
