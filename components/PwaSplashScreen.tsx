"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (typeof navigator !== "undefined" && "standalone" in navigator && Boolean(navigator.standalone))
  );
}

export function PwaSplashScreen() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isStandaloneMode()) return;
    if (sessionStorage.getItem("igunbill-splash-shown") === "true") return;

    setIsVisible(true);
    sessionStorage.setItem("igunbill-splash-shown", "true");

    const timer = window.setTimeout(() => {
      setIsVisible(false);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="pwa-splash fixed inset-0 z-[100] flex items-center justify-center bg-brand">
      <div className="flex flex-col items-center text-center">
        <Image alt="이건빌" height={128} priority src="/brand/igunbill-app-icon.svg" width={128} />
        <h1 className="mt-5 text-4xl font-extrabold text-white">이건빌</h1>
        <p className="mt-2 text-lg font-bold text-blue-100">임대 수익을 한눈에</p>
      </div>
    </div>
  );
}
