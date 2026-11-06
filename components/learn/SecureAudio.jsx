"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/supabase";
import DriveEmbed from "@/components/learn/DriveEmbed";
import { driveId, toPreviewUrl } from "@/lib/driveLink";

// Audio lessons: private uploads stream through /api/learn/stream (no
// downloadable URL); Google Drive links use Drive's player; plain hosted
// URLs play as before but with the download menu hidden.
export default function SecureAudio({ lesson, courseId, watermark }) {
  const drive = driveId(lesson.audioUrl) ? toPreviewUrl(lesson.audioUrl) : null;
  const isPrivate = !!lesson.audioPath;
  const [src, setSrc] = useState(isPrivate ? null : lesson.audioUrl || null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isPrivate) { setSrc(lesson.audioUrl || null); return; }
    let alive = true;
    apiFetch("/api/learn/media", { courseId, lessonId: lesson.id })
      .then((r) => { if (alive) setSrc(r.stream || r.url || null); })
      .catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
  }, [isPrivate, courseId, lesson.id, lesson.audioUrl]);

  return (
    <div className="mt-4 space-y-4">
      {drive ? (
        <DriveEmbed src={drive} title={lesson.title || "Audio"} aspect="audio" watermark={watermark} />
      ) : err ? (
        <div className="rounded-xl bg-paper p-4 text-sm text-danger">{err}</div>
      ) : src ? (
        <div className="sc-protected" onContextMenu={(e) => e.preventDefault()}>
          <audio src={src} controls controlsList="nodownload noplaybackrate" className="w-full" />
        </div>
      ) : (
        <div className="rounded-xl bg-paper p-4 text-sm text-inkmuted">{isPrivate ? "Loading audio…" : "No audio for this lesson."}</div>
      )}
      {lesson.text && <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{lesson.text}</p>}
    </div>
  );
}
