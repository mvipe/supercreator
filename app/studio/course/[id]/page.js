"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fromRow, toRow } from "@/lib/courseModel";
import { validateCourse } from "@/lib/validate";
import { fetchMe } from "@/lib/plan";
import SubscriptionModal from "@/components/SubscriptionModal";
import { useAuth } from "@/components/AuthProvider";
import PageDetailsTab from "@/components/editor/PageDetailsTab";
import CourseTab from "@/components/editor/CourseTab";
import SettingsTab from "@/components/editor/SettingsTab";
import PreviewPanel from "@/components/editor/PreviewPanel";

const TABS = [
  { id: "page", label: "Page details" },
  { id: "course", label: "Course" },
  { id: "settings", label: "Settings" }
];

export default function CourseEditor() {
  const { id } = useParams();
  const r = useRouter();
  const { user, loading } = useAuth();
  const [course, setCourse] = useState(null);
  const [tab, setTab] = useState("page");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [issues, setIssues] = useState([]);
  const [showSub, setShowSub] = useState(false);
  const saveRef = useRef(() => {});

  useEffect(() => {
    if (!user) return;
    supabase.from("mp_courses").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error || !data) { r.replace("/dashboard"); return; }
      setCourse(fromRow(data));
    });
  }, [user, id, r]);

  // Auto-save 900ms after the last edit (keeps current status).
  useEffect(() => {
    if (!dirty || !course) return;
    const t = setTimeout(() => saveRef.current(), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, dirty]);

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center text-inkmuted">Loading…</div>;
  if (!course) return <div className="flex min-h-screen items-center justify-center text-inkmuted">Loading course…</div>;

  const patch = (p) => { setCourse((c) => ({ ...c, ...p })); setDirty(true); setSaved(false); setIssues([]); };

  async function persist(status, skipValidate = false) {
    setErr(""); setIssues([]);
    if (status === "published" && !skipValidate) {
      const problems = validateCourse(course);
      if (problems.length) {
        setIssues(problems);
        if (problems.some((p) => p.includes("page URL"))) setTab("settings");
        return false;
      }
    }
    const { error } = await supabase.from("mp_courses").update({ ...toRow(course), status }).eq("id", id);
    if (error) {
      setErr(error.message.includes("duplicate") ? "That page URL is already taken — pick another slug in Settings." : error.message);
      return false;
    }
    setCourse((c) => ({ ...c, status }));
    setDirty(false);
    return true;
  }

  async function save() {
    setSaving(true);
    const ok = await persist(course.status === "published" ? "published" : course.status, true);
    setSaving(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }
  saveRef.current = save;

  async function publish() {
    const me = await fetchMe();
    if (!me.isPro) { setShowSub(true); return; }
    setPublishing(true);
    const ok = await persist("published");
    setPublishing(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  async function unpublish() {
    setPublishing(true);
    await persist("unpublished");
    setPublishing(false);
  }

  async function publishFree() {
    setShowSub(false);
    setPublishing(true);
    const ok = await persist("published");
    setPublishing(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex min-h-screen w-full flex-col border-r border-line bg-white lg:w-[420px] lg:shrink-0 xl:w-[480px]">
        <header className="flex items-center gap-3 border-b border-line px-7 py-4">
          <Link href="/dashboard/courses" className="rounded-lg p-1.5 text-inkmuted hover:bg-paper hover:text-ink" aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </Link>
          <span className="truncate text-sm font-bold uppercase tracking-wide">{course.title}</span>
          <span className={`pill ml-auto ${course.status === "published" ? "bg-teal-soft text-teal" : "bg-paper text-inkmuted"}`}>{course.status}</span>
        </header>
        <nav className="flex gap-7 border-b border-line px-7 pt-3">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`tab ${tab === t.id ? "active" : ""}`}>{t.label}</button>
          ))}
        </nav>
        <div className="flex-1 overflow-y-auto px-7 py-8 pb-32">
          {tab === "page" && <PageDetailsTab course={course} patch={patch} />}
          {tab === "course" && <CourseTab course={course} patch={patch} />}
          {tab === "settings" && <SettingsTab course={course} patch={patch} />}
        </div>
        {issues.length > 0 && (
          <div className="sticky bottom-[57px] border-t border-line bg-red-50 px-7 py-3">
            <p className="text-sm font-semibold text-danger">Finish these before publishing:</p>
            <ul className="mt-1.5 space-y-1">
              {issues.map((it, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-danger/90">
                  <span className="mt-0.5">•</span><span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <footer className="sticky bottom-0 flex flex-wrap items-center gap-2.5 border-t border-line bg-white/90 px-5 py-3 backdrop-blur">
          {err ? <span className="text-sm text-danger">{err}</span>
            : saving ? <span className="text-sm text-inkmuted">Saving…</span>
            : saved ? <span className="text-sm font-semibold text-teal">Saved ✓</span>
            : dirty ? <span className="text-sm text-inkmuted">Auto-saving…</span>
            : <span className="text-sm text-inkmuted">All saved</span>}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {course.status === "published" ? (
              <>
                <a href={`/c/${course.slug}`} target="_blank" className="btn-ghost text-sm px-3 py-2">View live ↗</a>
                <a href={`/studio/course/${id}/submissions`} target="_blank" className="btn-ghost text-sm px-3 py-2">📋 Submissions</a>
                <button onClick={unpublish} disabled={publishing} className="btn-ghost text-sm px-3 py-2">Unpublish</button>
                <button onClick={save} disabled={saving || !dirty} className="btn-ink text-sm px-3 py-2">{saving ? "Saving…" : "Save changes"}</button>
              </>
            ) : (
              <>
                <button onClick={save} disabled={saving || !dirty} className="btn-ghost text-sm px-3 py-2">{saving ? "Saving…" : "Save draft"}</button>
                <button onClick={publish} disabled={publishing} className="btn-brand text-sm px-3 py-2">{publishing ? "Publishing…" : "Publish →"}</button>
              </>
            )}
          </div>
        </footer>
      </div>
      <div className="hidden min-w-0 flex-1 lg:block">
        <PreviewPanel course={course} />
      </div>
      {showSub && (
        <SubscriptionModal onClose={() => setShowSub(false)}
          onSuccess={() => { setShowSub(false); publish(); }}
          onFree={publishFree} />
      )}
    </div>
  );
}
