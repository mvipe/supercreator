"use client";
// =============================================================
// DriveEmbed — Google Drive / Docs file shown in Google's own viewer
// (video, audio, PDF, Docs, Sheets, Slides).
//
// viewOnly covers Drive's "open in new window" pop-out button so learners
// can't jump to the file on Drive. Drive's download/print menu inside the
// viewer is controlled by the FILE's own sharing setting — creators should
// turn on "Viewers and commenters can't download, print or copy" in Drive.
// =============================================================

export default function DriveEmbed({ src, title = "File", watermark, viewOnly = true, aspect = "video", className = "" }) {
  if (!src) return null;
  const box = aspect === "doc" ? "h-[75vh]" : aspect === "audio" ? "h-28" : "aspect-video";
  return (
    <div className={`sc-protected relative w-full overflow-hidden rounded-2xl border border-line bg-black ${box} ${className}`}
      onContextMenu={(e) => e.preventDefault()}>
      <iframe src={src} title={title} className="absolute inset-0 h-full w-full" allow="autoplay; fullscreen" allowFullScreen
        referrerPolicy="no-referrer" />
      {viewOnly && (
        // Swallows clicks on Drive's top-right "pop-out" icon.
        <div aria-hidden="true" className="absolute right-0 top-0 h-14 w-16" onClick={(e) => e.preventDefault()} />
      )}
      {watermark && (
        <div aria-hidden="true"
          className="pointer-events-none absolute bottom-3 left-3 select-none rounded bg-black/40 px-2 py-1 font-mono text-[11px] text-white/70">
          {watermark}
        </div>
      )}
    </div>
  );
}
