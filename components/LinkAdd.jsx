"use client";
import { useState } from "react";
import { normalizeLink } from "@/lib/driveLink";

// =============================================================
// LinkAdd — the "or paste a Google Drive link" companion to every upload
// button. Click → small inline field → Add. The link is validated and
// normalised for its use (an image link becomes a direct image URL, etc.).
//
//   <LinkAdd kind="image" onAdd={(url) => …} />
// =============================================================

const PLACEHOLDER = {
  image: "https://drive.google.com/file/d/…/view",
  video: "https://drive.google.com/file/d/…/view",
  audio: "https://drive.google.com/file/d/…/view",
  doc: "https://docs.google.com/document/d/…",
  file: "https://drive.google.com/file/d/…/view"
};

export default function LinkAdd({ kind = "file", onAdd, label = "🔗 Drive link", className = "", buttonClassName = "", disabled = false }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");

  function add() {
    const r = normalizeLink(val, kind);
    if (!r.ok) { setErr(r.error); return; }
    onAdd?.(r.url, val.trim());
    setVal(""); setErr(""); setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" disabled={disabled} onClick={() => setOpen(true)}
        className={buttonClassName || `btn-ghost cursor-pointer text-xs ${className}`}
        title="Use a public Google Drive / Dropbox link instead of uploading">
        {label}
      </button>
    );
  }

  return (
    <div className={`w-full basis-full ${className}`}>
      <div className="flex gap-2">
        <input className="input !py-2 text-sm" autoFocus placeholder={PLACEHOLDER[kind] || PLACEHOLDER.file}
          value={val} onChange={(e) => { setVal(e.target.value); setErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } if (e.key === "Escape") setOpen(false); }} />
        <button type="button" onClick={add} className="btn-brand shrink-0 !px-3 !py-2 text-xs">Add</button>
        <button type="button" onClick={() => { setOpen(false); setErr(""); }} className="shrink-0 px-1 text-xs text-inkmuted hover:text-ink" aria-label="Cancel">✕</button>
      </div>
      <p className={`mt-1 text-[11px] ${err ? "text-danger" : "text-inkmuted"}`}>
        {err || "Share the file as “Anyone with the link → Viewer” first."}
      </p>
    </div>
  );
}
