"use client";
import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/supabase";
import VideoPlayer, { ytId } from "@/components/learn/VideoPlayer";

// =============================================================
// SecureVideo — protected lesson playback.
//
//   • short-lived signed URL, re-signed before it expires
//   • no download / PiP / right-click
//   • drifting watermark with the learner's phone number
//   • YouTube-backed lessons render in the SAME custom skin as uploaded
//     ones — no title bar, no logo, no "Watch on YouTube"
//
// It does NOT stop screen recording. No web page can — there's no browser
// API for it, and DRM only covers Android Chrome + Safari. The watermark is
// the deterrent: a leaked recording carries the leaker's own number.
// =============================================================

const REFRESH_MS = 100 * 60 * 1000; // URL lives 2h; re-sign at 100 min

export default function SecureVideo({ lesson, courseId, accent = "#2E6EF7", watermark }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // A YouTube link needs no signing — play it straight away.
  const yt = ytId(lesson.videoUrl);

  const load = useCallback(async () => {
    if (yt) { setLoading(false); return; }
    setLoading(true); setErr("");
    try {
      const res = await apiFetch("/api/learn/media", { courseId, lessonId: lesson.id });
      if (!res.url) throw new Error("No video attached to this lesson yet.");
      setUrl(res.url);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [courseId, lesson.id, yt]);

  useEffect(() => { load(); }, [load]);

  // Keep long lessons alive across the URL's expiry.
  useEffect(() => {
    if (yt || !url) return;
    const t = setInterval(async () => {
      try {
        const res = await apiFetch("/api/learn/media", { courseId, lessonId: lesson.id });
        if (res.url) setUrl(res.url);
      } catch { /* keep the current URL; it may still have time left */ }
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [url, courseId, lesson.id, yt]);

  if (!yt && loading) {
    return <div className="mt-4 flex aspect-video items-center justify-center rounded-2xl bg-black text-sm text-white/60">Loading video…</div>;
  }

  if (!yt && err) {
    return (
      <div className="mt-4 flex aspect-video flex-col items-center justify-center gap-3 rounded-2xl bg-black p-6 text-center">
        <div className="text-sm text-white/70">{err}</div>
        <button onClick={load} className="rounded-[8px] px-3 py-1.5 text-xs font-semibold text-white" style={{ background: accent }}>Retry</button>
      </div>
    );
  }

  if (!yt && !url) {
    return <div className="mt-4 flex aspect-video items-center justify-center rounded-2xl bg-black text-sm text-white/60">No video for this lesson</div>;
  }

  return (
    <div className="mt-4 space-y-4">
      <VideoPlayer
        src={yt ? undefined : url}
        youtubeUrl={yt ? lesson.videoUrl : undefined}
        watermark={watermark}
        accent={accent}
      />
      {lesson.text && <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{lesson.text}</p>}
    </div>
  );
}