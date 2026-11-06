"use client";
import { useEffect, useRef, useState } from "react";
import { loadPdfJs } from "@/lib/pdfjs";

// =============================================================
// ProtectedPdf — view-only PDF rendered to <canvas>, page by page.
//
// The old view-only mode put the PDF in an <iframe src={signedUrl}>. That
// iframe is the browser's own PDF viewer: right-click → Save as, Ctrl+S,
// and Inspect → copy src all worked, so "downloads off" didn't mean much.
//
// Here the bytes are fetched by script from /api/learn/stream (which refuses
// to be opened as a page or saved as a link) and drawn as pixels. There is
// no file URL in the DOM, no text layer to copy, no browser PDF toolbar,
// and every page carries the learner's watermark.
// =============================================================

export default function ProtectedPdf({ src, watermark, title = "Notes" }) {
  const wrapRef = useRef(null);
  const [pdf, setPdf] = useState(null);
  const [err, setErr] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let doc = null;
    setPdf(null); setErr("");
    (async () => {
      try {
        const res = await fetch(src, { cache: "no-store", credentials: "same-origin" });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Couldn't load the file (${res.status}).`);
        const buf = await res.arrayBuffer();
        const pdfjs = await loadPdfJs();
        doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
        if (cancelled) { doc.destroy(); return; }
        setPdf(doc); setPages(doc.numPages);
      } catch (e) {
        if (!cancelled) setErr(e.message || "Couldn't open this PDF.");
      }
    })();
    return () => { cancelled = true; try { doc?.destroy(); } catch { /* gone */ } };
  }, [src]);

  const fs = () => {
    const el = wrapRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.(); else document.exitFullscreen?.();
  };

  if (err) return <div className="flex h-[40vh] items-center justify-center bg-white p-6 text-center text-sm text-danger">{err}</div>;

  return (
    <div ref={wrapRef} className="sc-protected relative bg-[#323639]" onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()}>
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-[#202124]/95 px-3 py-2 text-xs text-white/80">
        <span className="min-w-0 flex-1 truncate">{title}{pages ? ` · ${pages} page${pages === 1 ? "" : "s"}` : ""}</span>
        <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} className="rounded px-2 py-1 hover:bg-white/10" aria-label="Zoom out">−</button>
        <span className="w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="rounded px-2 py-1 hover:bg-white/10" aria-label="Zoom in">+</button>
        <button type="button" onClick={fs} className="rounded px-2 py-1 hover:bg-white/10">⛶ Full screen</button>
      </div>
      <div className="max-h-[78vh] overflow-auto p-3 [&:fullscreen]:max-h-none">
        {!pdf && <div className="flex h-[40vh] items-center justify-center text-sm text-white/60">Loading notes…</div>}
        {pdf && Array.from({ length: pages }, (_, i) => (
          <PdfPage key={`${i}-${zoom}`} pdf={pdf} n={i + 1} zoom={zoom} watermark={watermark} />
        ))}
      </div>
    </div>
  );
}

/** One page, rendered only when it scrolls near the viewport. */
function PdfPage({ pdf, n, zoom, watermark }) {
  const holder = useRef(null);
  const canvas = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [visible, setVisible] = useState(n <= 2);

  // Page size first, so the scroll height is right before anything renders.
  useEffect(() => {
    let alive = true;
    pdf.getPage(n).then((page) => {
      if (!alive) return;
      const width = Math.min(holder.current?.parentElement?.clientWidth || 800, 1000) - 8;
      const base = page.getViewport({ scale: 1 });
      const scale = (width / base.width) * zoom;
      const vp = page.getViewport({ scale });
      setSize({ w: vp.width, h: vp.height });
    });
    return () => { alive = false; };
  }, [pdf, n, zoom]);

  useEffect(() => {
    if (visible || !holder.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: "800px" });
    io.observe(holder.current);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !size.w || !canvas.current) return;
    let task;
    let alive = true;
    pdf.getPage(n).then((page) => {
      if (!alive || !canvas.current) return;
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = page.getViewport({ scale: (size.w / base.width) * dpr });
      const c = canvas.current;
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      c.style.width = `${size.w}px`; c.style.height = `${size.h}px`;
      task = page.render({ canvasContext: c.getContext("2d"), viewport: vp });
    });
    return () => { alive = false; try { task?.cancel(); } catch { /* done */ } };
  }, [visible, size, pdf, n]);

  return (
    <div ref={holder} className="relative mx-auto mb-3 select-none bg-white shadow-lg" style={{ width: size.w || "100%", height: size.h || 600 }}>
      <canvas ref={canvas} className="block" />
      {watermark && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span className="rotate-[-28deg] select-none whitespace-nowrap font-mono text-lg font-semibold tracking-widest text-black/[0.07] sm:text-2xl">
            {watermark} · {watermark}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-1.5 right-2 text-[10px] text-black/30">{n}</div>
    </div>
  );
}
