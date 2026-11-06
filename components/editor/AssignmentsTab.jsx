"use client";
import { useState } from "react";
import { uid } from "@/lib/courseModel";
import { useAuth } from "@/components/AuthProvider";
import { Field, Switch } from "@/components/ui";
import { AssignmentEditor } from "@/components/editor/CourseTab";
import AssignmentReview from "@/components/editor/AssignmentReview";

// =============================================================
// Course editor → Assignments tab. Every assignment in the course in one
// place (create / edit / due dates / marks), plus the submissions inbox
// with grading — no more hunting through modules or a separate page.
// =============================================================

export default function AssignmentsTab({ course, patch }) {
  const { user } = useAuth();
  const mods = course.modules || [];
  const [open, setOpen] = useState(null);
  const [newIn, setNewIn] = useState(mods[0]?.id || "");
  const [counts, setCounts] = useState({}); // lessonId -> { total, pending }

  const items = [];
  mods.forEach((m, mi) => (m.lessons || []).forEach((l, li) => { if (l.type === "assignment") items.push({ l, m, mi, li }); }));

  const update = (mi, li, p) => patch({
    modules: mods.map((m, i) => i !== mi ? m : { ...m, lessons: m.lessons.map((l, j) => j !== li ? l : { ...l, ...p }) })
  });
  const remove = (mi, li) => {
    if (!confirm("Delete this assignment? Learners' submissions stay in the database but won't be shown.")) return;
    patch({ modules: mods.map((m, i) => i !== mi ? m : { ...m, lessons: m.lessons.filter((_, j) => j !== li) }) });
  };

  function create() {
    let target = mods.findIndex((m) => m.id === newIn);
    let modules = mods;
    if (target < 0) {
      modules = [...mods, { id: uid(), title: "Assignments", lessons: [] }];
      target = modules.length - 1;
    }
    const lesson = { id: uid(), type: "assignment", title: `Assignment ${items.length + 1}`, published: true, freePreview: false,
      prompt: "", allowUpload: true, allowLink: true, dueDate: "", maxMarks: 100, attachments: [] };
    patch({ modules: modules.map((m, i) => i === target ? { ...m, lessons: [...m.lessons, lesson] } : m) });
    setOpen(lesson.id);
  }

  function onStats(res) {
    const c = {};
    for (const s of res.submissions || []) {
      const x = c[s.lesson_id] || (c[s.lesson_id] = { total: 0, pending: 0 });
      x.total += 1; if (!s.marked) x.pending += 1;
    }
    setCounts(c);
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Assignments</h2>
            <p className="mt-0.5 text-xs text-inkmuted">Learners find these in their course under &ldquo;Assignments&rdquo; and inside each module.</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="input !w-auto !py-2 text-sm" value={newIn} onChange={(e) => setNewIn(e.target.value)}>
              {mods.map((m) => <option key={m.id} value={m.id}>{m.title || "Untitled module"}</option>)}
              <option value="__new__">+ New &ldquo;Assignments&rdquo; module</option>
            </select>
            <button onClick={create} className="btn-brand shrink-0 !py-2 text-sm">+ New assignment</button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {items.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-line p-8 text-center text-sm text-inkmuted">
              No assignments yet. Create one above — set a due date, marks and reference files.
            </div>
          )}
          {items.map(({ l, m, mi, li }) => {
            const isOpen = open === l.id;
            const c = counts[l.id];
            return (
              <div key={l.id} className="rounded-card border border-line bg-white">
                <button type="button" onClick={() => setOpen(isOpen ? null : l.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left">
                  <span className="text-lg">📝</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{l.title || "Untitled assignment"}</span>
                    <span className="block truncate text-xs text-inkmuted">
                      {m.title}
                      {l.dueDate ? ` · due ${new Date(l.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                      {` · ${l.maxMarks || 100} marks`}
                    </span>
                  </span>
                  {c && <span className={`pill shrink-0 ${c.pending ? "bg-yellow-100 text-yellow-700" : "bg-teal-soft text-teal"}`}>{c.pending ? `${c.pending} to grade` : `${c.total} graded`}</span>}
                  <span className={`pill shrink-0 ${l.published ? "bg-teal-soft text-teal" : "bg-paper text-inkmuted"}`}>{l.published ? "Published" : "Draft"}</span>
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t border-line bg-paper/50 px-3 py-3">
                    <Field label="Title"><input className="input" value={l.title} onChange={(e) => update(mi, li, { title: e.target.value })} /></Field>
                    <AssignmentEditor lesson={l} userId={user?.id} onChange={(p) => update(mi, li, p)} />
                    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5">
                      <span className="text-sm font-semibold">Published</span>
                      <Switch on={l.published} onChange={(v) => update(mi, li, { published: v })} />
                    </div>
                    <button type="button" onClick={() => remove(mi, li)} className="text-xs font-semibold text-danger">Delete assignment</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold">Submissions</h2>
        <p className="mt-0.5 mb-4 text-xs text-inkmuted">Grade work and leave feedback — learners see it in their course right away.</p>
        {course.id ? <AssignmentReview courseId={course.id} compact onStats={onStats} /> : null}
      </div>
    </div>
  );
}
