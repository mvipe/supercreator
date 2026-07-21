"use client";
import { useEffect } from "react";

// Logs a visit once per mount. Uses a stable anon id in localStorage.
// NOTE: prop is called `source` (not `ref`) — `ref` is reserved by React.
export default function VisitTracker({ ownerId, path, source, buyerPhone }) {
  useEffect(() => {
    if (!ownerId) return;
    let vid = null;
    try {
      vid = localStorage.getItem("mp_vid");
      if (!vid) { vid = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("mp_vid", vid); }
    } catch {}

    // document.referrer is the only reliable signal for WHERE the visitor came
    // from — the server's Referer header is our own page on a client-side nav.
    let referrer = "";
    let utmSource = "";
    try {
      referrer = document.referrer || "";
      utmSource = new URLSearchParams(window.location.search).get("utm_source") || "";
    } catch {}

    fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId, path, ref: source, visitorId: vid, buyerPhone: buyerPhone || null, referrer, utmSource })
    }).catch(() => {});
  }, [ownerId, path, source, buyerPhone]);
  return null;
}

/** Read the anon visitor id set by VisitTracker. */
export function visitorId() {
  try { return localStorage.getItem("mp_vid"); } catch { return null; }
}

/**
 * Log a click. Fire-and-forget with keepalive so it still lands when the
 * click is navigating the page away.
 */
export function trackClick({ ownerId, path, targetType, targetId, label }) {
  if (!ownerId) return;
  let referrer = "", utmSource = "";
  try {
    referrer = document.referrer || "";
    utmSource = new URLSearchParams(window.location.search).get("utm_source") || "";
  } catch {}
  try {
    fetch("/api/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ ownerId, path, targetType, targetId, label, visitorId: visitorId(), referrer, utmSource })
    }).catch(() => {});
  } catch {}
}