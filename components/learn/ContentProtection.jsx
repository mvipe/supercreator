"use client";
import { useEffect } from "react";

// =============================================================
// ContentProtection — page-level deterrents for the course player.
//
//   • right-click menu off (except inside text fields, so learners can
//     still paste into an assignment answer)
//   • Ctrl/⌘+S (save page), Ctrl/⌘+U (view source), Ctrl/⌘+P (print),
//     F12 / Ctrl+Shift+I/J/C / ⌘⌥I (DevTools) blocked
//   • dragging media out of the page blocked
//   • copying from protected areas blocked; protected areas print blank
//
// These stop casual saving. The real protection is server-side: media is
// only reachable through /api/learn/stream, which refuses downloads.
// =============================================================

const isField = (el) => !!el?.closest?.("input, textarea, select, [contenteditable='true']");

export default function ContentProtection({ enabled = true }) {
  useEffect(() => {
    if (!enabled) return;

    const onContext = (e) => { if (!isField(e.target)) e.preventDefault(); };
    const onDrag = (e) => { if (e.target?.closest?.("img, video, audio, canvas, iframe, .sc-protected")) e.preventDefault(); };
    const onCopy = (e) => {
      const sel = window.getSelection?.();
      const node = sel?.anchorNode?.parentElement;
      if (node?.closest?.(".sc-protected")) e.preventDefault();
    };
    const onKey = (e) => {
      const k = (e.key || "").toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (k === "f12") { e.preventDefault(); return; }
      if (mod && !e.shiftKey && !e.altKey && ["s", "u", "p"].includes(k)) { e.preventDefault(); return; }
      if (mod && e.shiftKey && ["i", "j", "c", "k"].includes(k)) { e.preventDefault(); return; }
      if (e.metaKey && e.altKey && ["i", "j", "c", "u"].includes(k)) { e.preventDefault(); return; }
    };

    document.addEventListener("contextmenu", onContext);
    document.addEventListener("dragstart", onDrag);
    document.addEventListener("copy", onCopy);
    window.addEventListener("keydown", onKey, true);
    document.documentElement.classList.add("sc-protect-page");
    return () => {
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("dragstart", onDrag);
      document.removeEventListener("copy", onCopy);
      window.removeEventListener("keydown", onKey, true);
      document.documentElement.classList.remove("sc-protect-page");
    };
  }, [enabled]);

  return null;
}
