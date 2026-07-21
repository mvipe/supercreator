"use client";
import { useState } from "react";

/** Dark grid preview panel with polished desktop/mobile browser frames. */
export default function PreviewFrame({ url, children, childrenMobile }) {
  const [device, setDevice] = useState("desktop");
  return (
    <div className="sticky top-0 flex h-screen flex-col bg-[#0C0D10] p-8 lg:p-10 xl:p-12"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(46,110,247,0.10), transparent 55%), linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 40px 40px, 40px 40px"
      }}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-white">Preview</h2>
          <p className="text-xs text-white/40">This is exactly what your visitors see.</p>
        </div>
        <div className="flex gap-1 rounded-[10px] border border-white/10 bg-white/5 p-1 shadow-inner">
          {[["desktop", "M3 5h18v11H3zM8 20h8M9 20v-4M15 20v-4"], ["mobile", "M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zM11 18h2"]].map(([d, path]) => (
            <button key={d} onClick={() => setDevice(d)} aria-label={d}
              className={`rounded-[7px] px-3.5 py-1.5 transition-all ${device === d ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.3)]" : "text-white/50 hover:text-white"}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d={path} /></svg>
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden">
        {device === "desktop" ? (
          <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[12px] border border-white/10 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] ring-1 ring-white/5">
            <div className="flex items-center gap-2 border-b border-black/40 bg-[#20232A] px-4 py-2.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e] shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" />
              <span className="mx-auto flex items-center gap-1.5 rounded-md bg-black/25 px-8 py-1 text-[11px] text-white/45">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
                {url}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-white">{children}</div>
          </div>
        ) : (
          <div className="flex h-full w-[390px] flex-col overflow-hidden rounded-[42px] border-[6px] border-[#1a1c22] bg-[#1a1c22] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.75)] ring-1 ring-white/10">
            <div className="relative flex items-center justify-center bg-[#1a1c22] pb-1.5 pt-2">
              <span className="h-1.5 w-24 rounded-full bg-white/20" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-t-[8px] bg-white">{childrenMobile || children}</div>
          </div>
        )}
      </div>
    </div>
  );
}
