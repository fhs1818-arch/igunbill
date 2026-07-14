"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function QuickRoomSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2">
      <label className="text-xs font-semibold text-slate-500" htmlFor="quick-room-search">
        빠른 검색
      </label>
      <div className="flex gap-2">
        <input
          id="quick-room-search"
          className="min-w-0 flex-1"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="호실, 세입자, 전화번호"
          type="search"
        />
        <button className="shrink-0" type="submit">
          검색
        </button>
      </div>
    </form>
  );
}
