"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const CONFIRM_MESSAGE =
  "기존 Room, RentPayment, Repair 데이터가 모두 삭제되고 백업 데이터로 교체됩니다. 계속하시겠습니까?";

export function RestoreBackupForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  function openFilePicker() {
    setMessage("");
    inputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!window.confirm(CONFIRM_MESSAGE)) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/restore", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { message?: string } | null;
        setMessage(result?.message ?? "백업 복원에 실패했습니다.");
        return;
      }

      router.push("/?restore=success");
      router.refresh();
    } catch {
      setMessage("백업 복원 중 오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />
      <button className="button" disabled={isPending} onClick={openFilePicker} type="button">
        {isPending ? "복원 중..." : "백업 복원"}
      </button>
      {message ? <span className="text-sm font-semibold text-red-700">{message}</span> : null}
    </div>
  );
}
