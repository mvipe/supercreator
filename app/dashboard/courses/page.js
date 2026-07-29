"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, apiFetch } from "@/lib/supabase";
import { DEFAULTS, fromRow, inr, lessonCount } from "@/lib/courseModel";
import { useAuth } from "@/components/AuthProvider";
import { StatsHero } from "@/components/dashboard/Hub";

const TABS = ["published", "unpublished", "draft"];

export default function Dashboard() {
  const { user, ownerId } = useAuth();
  const r = useRouter();
  const [courses, setCourses] = useState([]);
  const [perCourse, setPerCourse] = useState({}); // { courseId: {sales, revenue} }
  const [tab, setTab] = useState("published");
  const [q, setQ] = useState("");
  const [menuFor, setMenuFor] = useState(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const { data: rows } = await supabase.from("mp_courses").select("*").eq("owner_id", ownerId).order("updated_at", { ascending: false });
    setCourses((rows || []).map(fromRow));
    try {
      const { perCourse } = await apiFetch("/api/courses/stats", undefined, "GET");
      setPerCourse(perCourse || {});
    } catch { setPerCourse({}); }
  }
  useEffect(() => { if (user) load(); }, [user]);

  const totals = useMemo(() => {
    let s = 0, rev = 0;
    for (const id in perCourse) { s += perCourse[id].sales; rev += perCourse[id].revenue; }
    const views = courses.reduce((a, c) => a + (c.views || 0), 0);
    return { sales: s, revenue: rev, conv: views ? ((s / views) * 100).toFixed(1) + "%" : "0%" };
  }, [perCourse, courses]);

  const list = courses
    .filter((c) => c.status === tab)
    .filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));

  async function create() {
    setCreating(true);
    const { data, error } = await supabase.from("mp_courses").insert({
      owner_id: ownerId,
      title: DEFAULTS.title,
      status: "draft",
      cover_images: DEFAULTS.coverImages,
      description: DEFAULTS.description,
      button_text: DEFAULTS.buttonText,
      sections: DEFAULTS.sections,
      modules: DEFAULTS.modules,
      pricing: DEFAULTS.pricing,
      validity: DEFAULTS.validity,
      settings: DEFAULTS.settings
    }).select("id").single();
    setCreating(false);
    if (error) { alert(error.message); return; }
    r.push(`/studio/course/${data.id}`);
  }

  async function setStatus(c, status) {
    setMenuFor(null);
    if (status === "published" && !c.slug) {
      alert("Set a page URL in Settings before publishing.");
      r.push(`/studio/course/${c.id}`);
      return;
    }
    const { error } = await supabase.from("mp_courses").update({ status, updated_at: new Date().toISOString() }).eq("id", c.id);
    if (error) alert(error.message); else { setTab(status); load(); }
  }

  async function remove(c) {
    setMenuFor(null);
    if (!confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("mp_courses").delete().eq("id", c.id);
    if (error) alert(error.message); else load();
  }

  return (
    <main onClick={() => setMenuFor(null)}>
      <StatsHero
        title="Courses"
        subtitle="Create, publish and sell structured learning."
        cta="Create Course"
        onCta={create}
        stats={[["Total sales", totals.sales], ["Total revenue", inr(totals.revenue)], ["Conversion rate", totals.conv]]}
      />

      <section className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold capitalize ${tab === t ? "border-ink bg-ink text-white" : "border-line bg-white text-inkmuted hover:text-ink"}`}>
                {t} ({courses.filter((c) => c.status === t).length})
              </button>
            ))}
          </div>
          <input className="input ml-auto max-w-xs" placeholder="Search courses…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="card mt-5">
          <div className="grid grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
            <div className="col-span-5">Course</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2">Sales</div>
            <div className="col-span-2">Revenue</div>
            <div className="col-span-1" />
          </div>
          {list.length === 0 && (
            <div className="px-5 py-14 text-center">
              <p className="font-display text-lg font-bold">No {tab} courses yet</p>
              <p className="mt-1 text-sm text-inkmuted">Create a course and it will show up here.</p>
              <button onClick={create} className="btn-ink mt-4">+ Create course</button>
            </div>
          )}
          {list.map((c) => {
            const st = perCourse[c.id] || { sales: 0, revenue: 0 };
            return (
              <div key={c.id} className="relative grid grid-cols-12 items-center gap-4 border-b border-line px-5 py-4 last:border-0 hover:bg-paper/60">
                <Link href={`/studio/course/${c.id}`} className="col-span-5 flex min-w-0 items-center gap-3">
                  <div className="h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-paper">
                    {c.coverImages?.[0] && <img src={c.coverImages[0]} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{c.title}</div>
                    <div className="text-xs text-inkmuted">{lessonCount(c)} lessons</div>
                  </div>
                </Link>
                <div className="col-span-2 text-sm font-semibold">{c.pricing?.mode === "free" ? "Free" : inr(c.pricing?.price)}</div>
                <div className="col-span-2 text-sm">{st.sales}</div>
                <div className="col-span-2 text-sm">{inr(st.revenue)}</div>
                <div className="col-span-1 text-right">
                  <Link href={`/dashboard/courses/${c.id}`} className="inline-flex items-center justify-end gap-1 rounded-lg px-2 py-1 text-inkmuted transition hover:bg-paper hover:text-ink">
                    <span>↗</span>
                  </Link>
                  <button onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === c.id ? null : c.id); }}
                    className="ml-2 rounded-lg px-2 py-1 text-inkmuted hover:bg-paper hover:text-ink">⋮</button>
                  {menuFor === c.id && (
                    <div onClick={(e) => e.stopPropagation()} className="absolute right-4 top-12 z-20 w-48 overflow-hidden rounded-card border border-line bg-white text-left shadow-lg">
                      <Link href={`/studio/course/${c.id}`} className="block px-4 py-2.5 text-sm hover:bg-paper">Edit</Link>
                      {c.status !== "published" && <button onClick={() => setStatus(c, "published")} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-paper">Publish</button>}
                      {c.status === "published" && <button onClick={() => setStatus(c, "unpublished")} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-paper">Unpublish</button>}
                      {c.slug && c.status === "published" && <a href={`/c/${c.slug}`} target="_blank" className="block px-4 py-2.5 text-sm hover:bg-paper">View live page</a>}
                      <button onClick={() => remove(c)} className="block w-full px-4 py-2.5 text-left text-sm text-danger hover:bg-red-50">Delete</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
