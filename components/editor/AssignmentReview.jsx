"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/supabase";
import { isDriveUrl } from "@/lib/driveLink";

// =============================================================
// AssignmentReview — every learner submission for a course, with grading.
// Used by the course editor's "Assignments" tab and the stand-alone
// /studio/course/[id]/submissions page.
// =============================================================

export default function AssignmentReview({ courseId, compact = false, onStats }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("pending");
  const [which, setWhich] = useState("all");
  const [sel, setSel] = useState(null);
  const [marks, setMarks] = useState(0);
  const [total, setTotal] = useState(100);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setErr("");
    try {
      const res = await apiFetch(`/api/assignments/review?courseId=${courseId}`, undefined, "GET");
      setData(res);
      onStats?.(res);
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => { if (courseId) load(); }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxFor = (lessonId) => data?.assignments.find((a) => a.id === lessonId)?.maxMarks || 100;

  const list = useMemo(() => (data?.submissions || []).filter((s) => {
    if (which !== "all" && s.lesson_id !== which) return false;
    if (filter === "pending") return !s.marked;
    if (filter === "marked") return s.marked;
    return true;
  }), [data, filter, which]);

  function pick(s) {
    setSel(s);
    setMarks(s.marks_obtained ?? 0);
    setTotal(s.marks_total || maxFor(s.lesson_id));
    setFeedback(s.feedback || "");
  }

  async function grade() {
    setSaving(true);
    try {
      await apiFetch("/api/assignments/review", { id: sel.id, marks, total, feedback });
      await load();
      setSel(null);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }
  async function reopen() {
    if (!confirm("Un-grade this submission so the learner can resubmit?")) return;
    setSaving(true);
    try { await apiFetch("/api/assignments/review", { id: sel.id, action: "reopen" }); await load(); setSel(null); }
    catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  function exportCsv() {
    const rows = [["Student", "Phone", "Email", "Assignment", "Submitted", "Status", "Marks", "Total", "Link", "Notes", "Feedback"]];
    for (const s of list) rows.push([s.student.name, s.student.phone, s.student.email, s.assignmentTitle, s.submitted_at, s.marked ? "Graded" : "Pending", s.marks_obtained ?? "", s.marks_total ?? "", s.submission_url || "", s.submission_text || "", s.feedback || ""]);
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "assignment-submissions.csv";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (err) return <div className="rounded-[8px] bg-red-50 p-4 text-sm text-danger">{err} <button onClick={load} className="ml-2 font-semibold underline">Retry</button></div>;
  if (!data) return <div className="py-10 text-center text-sm text-inkmuted">Loading submissions…</div>;

  const pendingCount = data.submissions.filter((s) => !s.marked).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {[["pending", `⏳ Pending (${pendingCount})`], ["marked", "✓ Graded"], ["all", "All"]].map(([f, l]) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === f ? "border-ink bg-ink text-white" : "border-line bg-white text-inkmuted hover:text-ink"}`}>{l}</button>
        ))}
        <select className="input !w-auto !py-1.5 text-xs" value={which} onChange={(e) => setWhich(e.target.value)}>
          <option value="all">All assignments</option>
          {data.assignments.map((a) => <option key={a.id} value={a.id}>{a.title || "Untitled"}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <button onClick={load} className="btn-ghost !px-3 !py-1.5 text-xs">Refresh</button>
          <button onClick={exportCsv} disabled={!list.length} className="btn-ghost !px-3 !py-1.5 text-xs">Export CSV</button>
        </div>
      </div>

      <div className={`mt-4 grid gap-4 ${compact ? "" : "lg:grid-cols-3"}`}>
        <div className={`space-y-2 ${compact ? "" : "lg:col-span-2"} max-h-[70vh] overflow-y-auto`}>
          {list.length === 0 && <div className="rounded-xl border-2 border-dashed border-line p-8 text-center text-sm text-inkmuted">No submissions here yet.</div>}
          {list.map((s) => (
            <div key={s.id}>
              <button onClick={() => (sel?.id === s.id ? setSel(null) : pick(s))}
                className={`w-full rounded-xl border-2 p-3.5 text-left transition-all ${sel?.id === s.id ? "border-brand bg-brand/5" : "border-line bg-white hover:border-brand/40"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{s.student.name}</div>
                    <div className="truncate text-xs text-inkmuted">{s.assignmentTitle} · {new Date(s.submitted_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                    {s.submission_text && <div className="mt-1.5 line-clamp-2 text-sm">{s.submission_text}</div>}
                  </div>
                  {s.marked
                    ? <div className="shrink-0 text-right"><div className="font-bold text-teal">{s.marks_obtained}/{s.marks_total}</div><div className="text-[11px] text-teal">Graded</div></div>
                    : <span className="shrink-0 rounded-lg bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-700">Pending</span>}
                </div>
              </button>
              {compact && sel?.id === s.id && renderGrade()}
            </div>
          ))}
        </div>
        {!compact && (
          <div className="h-fit rounded-xl border-2 border-line bg-white p-4 lg:sticky lg:top-6">
            {sel ? renderGrade() : <div className="py-8 text-center text-sm text-inkmuted">👈 Select a submission to grade</div>}
          </div>
        )}
      </div>
    </div>
  );

  function renderGrade() {
    return (
      <div className={`space-y-3 ${compact ? "mt-2 rounded-xl border border-line bg-paper p-3.5" : ""}`}>
        <div>
          <div className="font-bold">{sel.student.name}</div>
          <div className="text-xs text-inkmuted">{[sel.student.phone && `+${String(sel.student.phone).replace(/^\+/, "")}`, sel.student.email].filter(Boolean).join(" · ") || sel.assignmentTitle}</div>
        </div>
        {sel.submission_text && <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-sm">{sel.submission_text}</div>}
        {sel.submission_url && (
          <a href={sel.submission_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
            {isDriveUrl(sel.submission_url) ? "🔗 Open Drive link" : "📎 Open submitted file"} ↗
          </a>
        )}
        <div>
          <label className="mb-1 block text-xs font-bold text-inkmuted">MARKS / TOTAL</label>
          <div className="flex items-center gap-2">
            <input type="number" min="0" max={total} className="input" value={marks} onChange={(e) => setMarks(Math.max(0, Number(e.target.value)))} />
            <span className="text-inkmuted">/</span>
            <input type="number" min="1" className="input" value={total} onChange={(e) => setTotal(Math.max(1, Number(e.target.value)))} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-inkmuted">FEEDBACK</label>
          <textarea className="input min-h-[80px]" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What went well, what to improve…" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={grade} disabled={saving} className="btn-brand flex-1">{saving ? "Saving…" : sel.marked ? "Update grade" : "Submit grade"}</button>
          {sel.marked && <button onClick={reopen} disabled={saving} className="btn-ghost text-xs">Allow resubmission</button>}
        </div>
      </div>
    );
  }
}
