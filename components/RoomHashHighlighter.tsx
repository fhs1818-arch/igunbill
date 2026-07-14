"use client";

import { useEffect } from "react";

const HIGHLIGHT_CLASS = "room-search-highlight";

export function RoomHashHighlighter() {
  useEffect(() => {
    if (!window.location.hash) return;

    const id = window.location.hash.slice(1);
    const element = document.getElementById(id);
    if (!element) return;

    element.scrollIntoView({ block: "center" });
    element.classList.add(HIGHLIGHT_CLASS);

    const timeout = window.setTimeout(() => {
      element.classList.remove(HIGHLIGHT_CLASS);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}
