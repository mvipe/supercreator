"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { normalizeLink, isDriveUrl } from "@/lib/driveLink";

// Learner's submission box for one assignment: upload a file, paste a
// Google Drive / Docs link, and/or write a note. Can be resubmitted until
// the instructor grades it.
export default function AssignmentSubmission({ courseId, lessonId, allowUpload = true, allowLink = true, maxMarks, onSubmitted }) {
  const { user } = useAuth();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [link, setLink] = useState("");
  const [mode, setMode] = useState(allowUpload ? "file" : "link"); // file | link
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user || !courseId || !lessonId) return;
    loadSubmission();
  }, [user, courseId, lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function token() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  async function loadSubmission() {
    try {
      const t = await token();
      if (!t) return;
      const res = await fetch(`/api/assignments/submit?courseId=${courseId}&lessonId=${lessonId}`, { headers: { Authorization: `Bearer ${t}` } });
      const result = await res.json();
      setSubmission(result.submission || null);
    } catch (e) {
      console.error("Error loading submission:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setErr("");
    let cleanLink = "";
    if (mode === "link" && link.trim()) {
      const r = normalizeLink(link, "file");
      if (!r.ok) { setErr(r.error); return; }
      cleanLink = r.url;
    }
    const useFile = mode === "file" ? file : null;
    if (!useFile && !cleanLink && !text.trim()) { setErr("Add a file, a link or a note before submitting."); return; }
    if (useFile && useFile.size > 25 * 1024 * 1024) { setErr("Files must be under 25 MB — use a Google Drive link for bigger files."); return; }

    setUploading(true);
    try {
      const t = await token();
      if (!t) { setErr("Please log in to submit."); return; }
      const fd = new FormData();
      if (useFile) fd.append("file", useFile);
      if (cleanLink) fd.append("link", cleanLink);
      fd.append("courseId", courseId);
      fd.append("lessonId", lessonId);
      fd.append("submissionText", text);
      const res = await fetch("/api/assignments/submit", { method: "POST", headers: { Authorization: `Bearer ${t}` }, body: fd });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Submission failed");
      setSubmission(result.submission);
      setFile(null); setLink(""); setText(""); setEditing(false);
      onSubmitted?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="text-sm text-inkmuted">Loading…</div>;

  const SubmittedFile = ({ s, tone }) => s.submission_url ? (
    <a href={s.submission_url} target="_blank" rel="noopener noreferrer" className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${tone}`}>
      {isDriveUrl(s.submission_url) ? "🔗 Open your Drive link" : "📎 View your submission"}
    </a>
  ) : null;

  // Graded
  if (submission?.marked) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-teal bg-teal/5 p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">✓</div>
          <div className="flex-1">
            <div className="font-semibold text-teal">Submitted and graded</div>
            <div className="mt-1 text-sm text-inkmuted">
              Score: <span className="font-bold text-teal">{submission.marks_obtained}/{submission.marks_total}</span>
            </div>
            {submission.feedback && (
              <div className="mt-3 rounded-lg border border-teal bg-white p-3">
                <div className="mb-1 text-xs font-bold text-inkmuted">Feedback</div>
                <div className="whitespace-pre-wrap text-sm text-ink">{submission.feedback}</div>
              </div>
            )}
            {submission.marked_at && <div className="mt-2 text-xs text-inkmuted">Graded on {new Date(submission.marked_at).toLocaleDateString("en-IN")}</div>}
            <SubmittedFile s={submission} tone="text-brand" />
          </div>
        </div>
      </div>
    );
  }

  // Submitted, awaiting review
  if (submission && !editing) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-yellow-300 bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⏳</div>
          <div className="flex-1">
            <div className="font-semibold text-yellow-700">Submitted — awaiting review</div>
            <div className="mt-1 text-sm text-yellow-600">Your instructor will review and grade your work{maxMarks ? ` (out of ${maxMarks})` : ""}.</div>
            <div className="mt-2 text-xs text-yellow-600">Submitted on {new Date(submission.submitted_at).toLocaleString("en-IN")}</div>
            {submission.submission_text && <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{submission.submission_text}</p>}
            <SubmittedFile s={submission} tone="text-yellow-700" />
            <div><button onClick={() => { setEditing(true); setText(submission.submission_text || ""); }} className="mt-3 text-xs font-semibold text-yellow-800 underline">Update submission</button></div>
          </div>
        </div>
      </div>
    );
  }

  const canFile = allowUpload !== false;
  const canLink = allowLink !== false;

  return (
    <div className="mt-4 rounded-2xl border-2 border-line bg-white p-4">
      <label className="mb-2 block text-sm font-bold text-ink">📤 {editing ? "Update your submission" : "Submit assignment"}</label>

      <textarea value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Write your answer, or add notes about your submission…" className="input mb-3 min-h-20 w-full" />

      {canFile && canLink && (
        <div className="mb-3 flex gap-1.5">
          {[["file", "📎 Upload file"], ["link", "🔗 Google Drive link"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setMode(v)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${mode === v ? "border-brand bg-brand-soft text-brand" : "border-line text-inkmuted"}`}>{l}</button>
          ))}
        </div>
      )}

      {canFile && mode === "file" && (
        <label className="mb-3 block">
          <div className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line p-4 transition-all hover:border-brand/40">
            <span className="text-xl">📎</span>
            <div className="text-left">
              <div className="text-sm font-semibold text-ink">{file?.name || "Choose a file"}</div>
              <div className="text-xs text-inkmuted">PDF, Word, images or ZIP · up to 25 MB</div>
            </div>
          </div>
          <input type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip"
            onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
      )}

      {canLink && (mode === "link" || !canFile) && (
        <div className="mb-3">
          <input className="input" placeholder="https://drive.google.com/file/d/… or https://docs.google.com/…" value={link} onChange={(e) => setLink(e.target.value)} />
          <p className="mt-1 text-[11px] text-inkmuted">Share it as &ldquo;Anyone with the link → Viewer&rdquo; so your instructor can open it.</p>
        </div>
      )}

      {err && <p className="mb-2 text-sm text-danger">{err}</p>}
      <div className="flex gap-2">
        {editing && <button onClick={() => setEditing(false)} className="btn btn-ghost">Cancel</button>}
        <button onClick={handleSubmit} disabled={uploading} className="btn btn-brand flex-1 disabled:opacity-50">
          {uploading ? "Submitting…" : editing ? "Update submission" : "Submit assignment"}
        </button>
      </div>
    </div>
  );
}
