"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function isMobile() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [canShow, setCanShow] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      setIsInstalled(isStandalone());
      setCanShow(isMobile() && !isStandalone());
    };

    updateVisibility();
    window.addEventListener("resize", updateVisibility);
    window.addEventListener("appinstalled", updateVisibility);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      updateVisibility();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("resize", updateVisibility);
      window.removeEventListener("appinstalled", updateVisibility);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (!canShow || isInstalled) return null;

  async function handleInstall() {
    if (isIos()) {
      setShowIosGuide((value) => !value);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => null);
    setDeferredPrompt(null);
    setIsInstalled(isStandalone());
  }

  return (
    <div className="grid gap-2 rounded-md border border-blue-100 bg-blue-50 p-3 md:hidden">
      <button className="button-primary w-full" onClick={handleInstall} type="button">
        홈 화면에 설치
      </button>
      {isIos() && showIosGuide ? (
        <p className="text-xs leading-5 text-slate-700">
          iPhone Safari에서는 공유 버튼을 누른 뒤 "홈 화면에 추가"를 선택해주세요.
        </p>
      ) : null}
      {!isIos() && !deferredPrompt ? (
        <p className="text-xs leading-5 text-slate-600">
          설치가 가능한 상태가 되면 버튼으로 앱을 설치할 수 있습니다.
        </p>
      ) : null}
    </div>
  );
}
