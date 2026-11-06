"use client";
import { useEffect } from "react";

// Captures ?ref=CODE from any page into localStorage so the referral survives
// the trip through login / signup. The dashboard reads "mp_ref" and passes it
// to /api/profile/ensure when the new creator's profile is created.
// First touch wins; a code older than 30 days is replaced.
export default function RefCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("ref");
      if (!code || !/^[A-Za-z0-9]{4,16}$/.test(code)) return;
      const at = Number(localStorage.getItem("mp_ref_at") || 0);
      const stale = !at || Date.now() - at > 30 * 86400000;
      if (!localStorage.getItem("mp_ref") || stale) {
        localStorage.setItem("mp_ref", code.toUpperCase());
        localStorage.setItem("mp_ref_at", String(Date.now()));
      }
    } catch { /* storage blocked — nothing to do */ }
  }, []);
  return null;
}
