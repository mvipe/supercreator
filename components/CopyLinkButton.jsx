"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// =============================================================
// CopyLinkButton — "Copy link" with visible feedback.
//
// The old buttons called navigator.clipboard.writeText() and nothing else:
// the link WAS copied, but the page never acknowledged it, so it read as a
// dead button. This one swaps the label to "Link copied", flips the icon to
// a tick, flashes the accent colour and floats a small toast — then resets
// itself after ~1.8s.
//
// It also survives the two cases where navigator.clipboard is unavailable:
// non-HTTPS origins and older in-app browsers (Instagram / Facebook), where
// it falls back to a hidden textarea + execCommand("copy").
// =============================================================

/** Copy `text`, returning true on success. Works without navigator.clipboard. */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

const IconLink = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </svg>
);
const IconTick = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
);

/**
 * @param {string}  [value]      text to copy — defaults to the current page URL
 * @param {string}  [label]      idle label
 * @param {string}  [copiedLabel]
 * @param {string}  [accent]     colour used for the copied state
 * @param {string}  [className]  layout classes for the button
 * @param {boolean} [toast]      float a "Link copied" pill above the button
 */
export default function CopyLinkButton({
  value,
  label = "Copy link — invite your network",
  copiedLabel = "Link copied!",
  accent = "#2E6EF7",
  className = "",
  style,
  toast = true,
  onCopied
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const run = useCallback(async () => {
    const text = value || (typeof window !== "undefined" ? window.location.href : "");
    if (!text) return;
    const ok = await copyText(text);
    clearTimeout(timer.current);
    setCopied(ok);
    setFailed(!ok);
    if (ok) onCopied?.(text);
    timer.current = setTimeout(() => { setCopied(false); setFailed(false); }, 1800);
  }, [value, onCopied]);

  return (
    <span className="relative block">
      {/* floating confirmation */}
      {toast && copied && (
        <span
          className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold text-white shadow-lg"
          style={{ background: accent, animation: "sc-copy-pop .28s cubic-bezier(.2,1.4,.5,1)" }}
        >
          {copiedLabel}
        </span>
      )}

      <button
        type="button"
        onClick={run}
        aria-live="polite"
        className={`relative inline-flex w-full items-center justify-center gap-2 overflow-hidden transition-[color,border-color,background-color,transform] duration-200 active:scale-[.98] ${className}`}
        style={{
          ...style,
          ...(copied ? { borderColor: accent, color: accent, background: `${accent}14` } : null)
        }}
      >
        <span
          className="inline-flex h-4 w-4 items-center justify-center transition-transform duration-300"
          style={{ transform: copied ? "rotate(360deg) scale(1.1)" : "none" }}
        >
          {copied ? <IconTick className="h-3.5 w-3.5" /> : <IconLink className="h-3.5 w-3.5" />}
        </span>
        <span>{failed ? "Press Ctrl+C to copy" : copied ? copiedLabel : label}</span>

        {/* ripple sweep on success */}
        {copied && (
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent, ${accent}33, transparent)`,
              animation: "sc-copy-sweep .6s ease-out"
            }}
          />
        )}
      </button>

    </span>
  );
}
