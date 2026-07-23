"use client";
import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/supabase";

// =============================================================
// SecureNotes — lesson notes / PDFs with a creator-controlled download gate.
//
//   allowDownload = true   -> viewer + a real Download button
//   allowDownload = false  -> in-app viewer only, no download affordance
//
// Honest scope: this controls the *product*, not physics. A determined user
// can still pull the signed URL out of the network tab while they're viewing
// it — anything the browser renders, the browser has. What this does give you:
// the file is not public, the link dies in 2 hours, it's tied to a purchase,
// and casual "right-click → Save as" is gone. That covers the realistic case.
// =============================================================

export default function SecureNotes({ lesson, courseId, accent = "#2E6EF7", watermark }) {
  const [state, setState] = useState({ loading: true, url: null, allowDownload: false, err: "" });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, err: "" }));
    try {
      const res = await apiFetch("/api/learn/media", { courseId, lessonId: lesson.id });
      if (!res.url) throw new Error("No file attached to this lesson.");
      setState({
        loading: false,
        url: res.url,
        // Server decides — never trust a client-side flag for an entitlement.
        allowDownload: !!res.allowDownload,
        err: ""
      });
    } catch (e) {
      setState({ loading: false, url: null, allowDownload: false, err: e.message });
    }
  }, [courseId, lesson.id]);

  useEffect(() => { load(); }, [load]);

  const { loading, url, allowDownload, err } = state;
  const isPdf = /\.pdf(\?|$)/i.test(lesson.fileName || url || "") || lesson.fileType === "application/pdf";

  async function download() {
    try {
      // Fetch + blob so the signed URL never lands in the address bar.
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = lesson.fileName || `${lesson.title || "notes"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  }

  if (loading) return <div className="mt-4 rounded-2xl border border-line bg-paper p-8 text-center text-sm text-inkmuted">Loading notes…</div>;

  if (err) {
    return (
      <div className="mt-4 rounded-2xl border border-line bg-paper p-6 text-center">
        <p className="text-sm text-danger">{err}</p>
        <button onClick={load} className="btn-ghost mt-3">Retry</button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border border-b-0 border-line bg-paper px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{lesson.fileName || lesson.title || "Notes"}</div>
          <div className="text-xs text-inkmuted">
            {allowDownload ? "You can download this file" : "View only — the creator has disabled downloads"}
          </div>
        </div>
        {allowDownload ? (
          <button onClick={download} className="btn text-white" style={{ background: accent }}>
            ↓ Download
          </button>
        ) : (
          <span className="pill bg-paper text-inkmuted" title="Downloads are turned off for this lesson">🔒 View only</span>
        )}
      </div>

      <div
        className="relative -mt-4 overflow-hidden rounded-b-2xl border border-line bg-[#323639]"
        onContextMenu={allowDownload ? undefined : (e) => e.preventDefault()}
      >
        {isPdf ? (
          <iframe
            // toolbar=0 hides Chrome's built-in PDF download/print buttons.
            // It's a UX gate, not a security boundary — see the note up top.
            src={allowDownload ? url : `${url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            className="h-[75vh] w-full"
            title={lesson.title || "Notes"}
          />
        ) : (
          <div className="flex h-[40vh] flex-col items-center justify-center gap-3 bg-white p-6 text-center">
            <div className="text-4xl">📄</div>
            <p className="text-sm text-inkmuted">
              This file type can't be previewed in the browser.
            </p>
            {allowDownload
              ? <button onClick={download} className="btn text-white" style={{ background: accent }}>↓ Download to view</button>
              : <p className="text-xs text-inkmuted">The creator has disabled downloads for this lesson, so it can't be opened here.</p>}
          </div>
        )}

        {watermark && !allowDownload && (
          <div aria-hidden="true"
            className="pointer-events-none absolute bottom-3 right-3 select-none rounded bg-black/50 px-2 py-1 font-mono text-[11px] text-white/70">
            {watermark}
          </div>
        )}
      </div>

      {lesson.text && <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{lesson.text}</p>}
    </div>
  );
}