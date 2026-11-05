"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fromRow, ytEmbed, lessonCount } from "@/lib/courseModel";
import { useAuth } from "@/components/AuthProvider";
import { LatexText } from "@/components/editor/LatexRenderer";
import QuizModal from "@/components/QuizModal";
import AssignmentSubmission from "@/components/AssignmentSubmission";
import SecureVideo from "@/components/learn/SecureVideo";
import SecureNotes from "@/components/learn/SecureNotes";
import SecureAudio from "@/components/learn/SecureAudio";
import ContentProtection from "@/components/learn/ContentProtection";
import { ytId } from "@/components/learn/VideoPlayer";
import { apiFetch } from "@/lib/supabase";
import { isDriveUrl } from "@/lib/driveLink";
import { BRAND } from "@/lib/brand";

const LESSON_ICON = { video: "🎬", text: "📄", audio: "🎙️", quiz: "🏅", assignment: "📝", notes: "📚" };

/** Upcoming first, then past. */
function splitLive(classes) {
  const now = Date.now();
  const withTime = (c) => (c.datetime ? new Date(c.datetime).getTime() : null);
  const upcoming = classes.filter((c) => { const t = withTime(c); return t === null || t >= now; })
    .sort((a, b) => (withTime(a) ?? Infinity) - (withTime(b) ?? Infinity));
  const past = classes.filter((c) => { const t = withTime(c); return t !== null && t < now; })
    .sort((a, b) => (withTime(b) ?? 0) - (withTime(a) ?? 0));
  return { upcoming, past };
}

export default function LearnPage() {
  const { slug } = useParams();
  const r = useRouter();
  const { user, loading } = useAuth();
  const [course, setCourse] = useState(null);
  const [purchase, setPurchase] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | locked | expired
  const [active, setActive] = useState(null); // lesson id, "__live__" or "__assignments__"
  const [subs, setSubs] = useState({});        // lessonId -> my submission (for the Assignments view)
  const [showCert, setShowCert] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { r.replace(`/login?next=/learn/${slug}`); return; }
    (async () => {
      const { data: row } = await supabase.from("mp_courses").select("*").eq("slug", slug).maybeSingle();
      if (!row) { setState("locked"); return; }
      const c = fromRow(row);
      setCourse(c);
      const { data: p } = await supabase.from("mp_purchases").select("*").eq("product_type", "course").eq("product_id", c.id).eq("buyer_id", user.id).maybeSingle();
      if (!p) { setState("locked"); return; }
      if (p.expires_at && new Date(p.expires_at) < new Date()) { setState("expired"); return; }
      setPurchase(p);
      const first = c.modules.flatMap((m) => m.lessons).find((l) => l.published);
      setActive(first?.id || null);
      setState("ok");
    })();
  }, [loading, user, slug, r]);

  const lessons = useMemo(() => (course?.modules || []).flatMap((m) => m.lessons.filter((l) => l.published)), [course]);
  const progress = purchase?.progress || {};
  const doneCount = lessons.filter((l) => progress[l.id]).length;
  const allDone = lessons.length > 0 && doneCount === lessons.length;
  const current = lessons.find((l) => l.id === active);
  const accent = course?.settings?.accent || "#2E6EF7";
  const liveClasses = course?.settings?.liveClasses || [];
  const showingLive = active === "__live__";
  const showingAssignments = active === "__assignments__";
  const assignments = lessons.filter((l) => l.type === "assignment");

  // My submissions for every assignment — powers the Assignments overview.
  async function loadSubs() {
    if (!course?.id) return;
    try {
      const res = await apiFetch(`/api/assignments/submit?courseId=${course.id}&all=1`, undefined, "GET");
      setSubs(Object.fromEntries((res.submissions || []).map((x) => [x.lesson_id, x])));
    } catch { /* non-fatal */ }
  }
  useEffect(() => { if (state === "ok" && assignments.length) loadSubs(); }, [state, course?.id, assignments.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // Stamped over protected media so a leaked recording identifies the leaker.
  const watermark = user?.user_metadata?.phone ? `+${user.user_metadata.phone}` : (user?.email || "");

  async function toggleDone(lessonId, done) {
    setPurchase((p) => ({ ...p, progress: { ...p.progress, [lessonId]: done } }));
    await supabase.rpc("mp_mark_lesson", { p_purchase_id: purchase.id, p_lesson_id: lessonId, p_done: done });
  }

  if (state === "loading" || loading) return <div className="flex min-h-screen items-center justify-center text-inkmuted">Loading…</div>;
  if (state === "locked") return (
    <Gate title="You don't have access to this course yet"
      body="Buy the course to unlock all lessons." cta="View course" onCta={() => r.push(`/c/${slug}`)} />
  );
  if (state === "expired") return (
    <Gate title="Your access has expired"
      body="This course was sold with limited-period access, and yours has ended. Purchase again to continue." cta="View course" onCta={() => r.push(`/c/${slug}`)} />
  );

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <ContentProtection />
      {/* Sidebar */}
      <aside className="w-full shrink-0 border-b border-line bg-white lg:h-screen lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="border-b border-line p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-inkmuted">Course</div>
          <h1 className="mt-0.5 font-display text-lg font-bold leading-snug">{course.title}</h1>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full transition-all" style={{ width: `${lessons.length ? (doneCount / lessons.length) * 100 : 0}%`, background: accent }} />
          </div>
          <div className="mt-1.5 text-xs text-inkmuted">{doneCount} of {lessons.length} lessons complete</div>
          {course.settings?.certificate && (
            <button onClick={() => allDone && setShowCert(true)} disabled={!allDone}
              className={`mt-3 w-full rounded-[10px] px-3 py-2 text-sm font-semibold ${allDone ? "text-white" : "cursor-not-allowed bg-paper text-inkmuted"}`}
              style={allDone ? { background: accent } : {}}>
              {allDone ? "🎓 Get your certificate" : "Certificate unlocks at 100%"}
            </button>
          )}
        </div>
        <nav className="p-3">
          {course.modules.map((m) => (
            <div key={m.id} className="mb-3">
              <div className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-inkmuted">{m.title}</div>
              {m.lessons.filter((l) => l.published).map((l) => (
                <div key={l.id}>
                  <button onClick={() => setActive(l.id)}
                    className={`flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left text-sm ${active === l.id ? "bg-paper font-semibold" : "hover:bg-paper/60"}`}>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${progress[l.id] ? "border-transparent text-white" : "border-line text-transparent"}`}
                      style={progress[l.id] ? { background: accent } : {}}>✓</span>
                    <span className="flex-1 truncate">{l.type === "quiz" ? l.quizTitle || l.title : l.title}</span>
                    <span className="shrink-0 text-[11px] text-inkmuted">{LESSON_ICON[l.type] || ""}</span>
                  </button>
                  {/* Mobile accordion: the tapped lesson opens right here, not far below. */}
                  {active === l.id && (
                    <div className="mb-2 mt-1 border-l-2 pl-3 lg:hidden" style={{ borderColor: accent }}>
                      <LessonView course={course} current={l} accent={accent} watermark={watermark}
                        progress={progress} onToggleDone={toggleDone} lessons={lessons} onGo={setActive} liveClasses={liveClasses} onSubmitted={loadSubs} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Assignments: one place to see every task, its due date and
              whether it's submitted / graded. */}
          {assignments.length > 0 && (
            <div className="mb-3 border-t border-line pt-3">
              <div className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-inkmuted">Assignments</div>
              <button onClick={() => setActive("__assignments__")}
                className={`flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left text-sm ${showingAssignments ? "bg-paper font-semibold" : "hover:bg-paper/60"}`}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[13px]">📝</span>
                <span className="flex-1 truncate">All assignments</span>
                <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: accent }}>
                  {assignments.filter((a) => subs[a.id]).length}/{assignments.length}
                </span>
              </button>
              {showingAssignments && (
                <div className="mb-2 mt-1 border-l-2 pl-3 lg:hidden" style={{ borderColor: accent }}>
                  <AssignmentsOverview items={assignments} subs={subs} accent={accent} onGo={setActive} />
                </div>
              )}
            </div>
          )}

          {/* Live classes get their own sidebar entry, next to lessons and
              quizzes — only when the creator has actually scheduled some. */}
          {liveClasses.length > 0 && (
            <div className="mb-3 border-t border-line pt-3">
              <div className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-inkmuted">Live</div>
              <button onClick={() => setActive("__live__")}
                className={`flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left text-sm ${showingLive ? "bg-paper font-semibold" : "hover:bg-paper/60"}`}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[13px]">🔴</span>
                <span className="flex-1 truncate">Live Classes</span>
                <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: accent }}>
                  {liveClasses.length}
                </span>
              </button>
              {/* Mobile accordion: live schedule opens inline under this entry. */}
              {showingLive && (
                <div className="mb-2 mt-1 border-l-2 pl-3 lg:hidden" style={{ borderColor: accent }}>
                  <LiveClasses classes={liveClasses} accent={accent} />
                </div>
              )}
            </div>
          )}
        </nav>
      </aside>

      {/* Player — desktop only. On mobile the content expands inline in the
          sidebar (accordion), directly under the lesson you tapped. */}
      <main className="hidden min-w-0 flex-1 p-4 sm:p-8 lg:block">
        {showingLive ? (
          <LiveClasses classes={liveClasses} accent={accent} />
        ) : showingAssignments ? (
          <AssignmentsOverview items={assignments} subs={subs} accent={accent} onGo={setActive} />
        ) : current ? (
          <LessonView course={course} current={current} accent={accent} watermark={watermark}
            progress={progress} onToggleDone={toggleDone} lessons={lessons} onGo={setActive} liveClasses={liveClasses} onSubmitted={loadSubs} />
        ) : (
          <div className="flex h-full items-center justify-center text-inkmuted">This course has no published lessons yet.</div>
        )}
      </main>

      {/* Certificate */}
      {showCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:bg-white print:p-0" onClick={() => setShowCert(false)}>
          <div className="w-full max-w-2xl bg-white p-2 print:max-w-none" onClick={(e) => e.stopPropagation()}>
            <div id="certificate" className="border-8 p-10 text-center" style={{ borderColor: accent }}>
              <div className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>Certificate of completion</div>
              <div className="mt-6 text-sm text-inkmuted">This certifies that</div>
              <div className="mt-1 font-display text-3xl font-bold">+{user.user_metadata?.phone}</div>
              <div className="mt-4 text-sm text-inkmuted">has successfully completed the course</div>
              <div className="mt-1 font-display text-2xl font-bold">{course.title}</div>
              <div className="mt-6 text-sm text-inkmuted">{lessonCount(course)} lessons · Completed on {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
              <div className="mx-auto mt-8 h-px w-40" style={{ background: accent }} />
              <div className="mt-2 text-xs text-inkmuted">Issued via {BRAND.name}</div>
            </div>
            <div className="flex justify-end gap-2 p-3 print:hidden">
              <button className="btn-ghost" onClick={() => setShowCert(false)}>Close</button>
              <button className="btn-ink" onClick={() => window.print()}>Download / Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** The lesson player: title, content, complete/next, live promo. Shared by the
    desktop right panel and the mobile inline accordion so both stay in sync. */
function LessonView({ course, current, accent, watermark, progress, onToggleDone, lessons, onGo, liveClasses, onSubmitted }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="font-display text-2xl font-bold">{current.type === "quiz" ? current.quizTitle || current.title : current.title}</h2>
      <LessonContent lesson={current} accent={accent} courseId={course.id} watermark={watermark}
        cover={course.coverImages?.[0] || course.cover_images?.[0]} onSubmitted={onSubmitted} />
      <div className="mt-6 flex items-center gap-3">
        <button onClick={() => onToggleDone(current.id, !progress[current.id])}
          className="btn text-white" style={{ background: progress[current.id] ? "#0E9F6E" : accent }}>
          {progress[current.id] ? "✓ Completed" : "Mark as complete"}
        </button>
        <NextBtn lessons={lessons} current={current} onGo={onGo} />
      </div>
      {liveClasses.length > 0 && (
        <button onClick={() => onGo("__live__")}
          className="mt-10 flex w-full items-center gap-3 rounded-2xl border border-line bg-paper p-4 text-left hover:bg-paper/60">
          <span className="text-xl">🔴</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              {liveClasses.length} live {liveClasses.length === 1 ? "class" : "classes"} scheduled
            </span>
            <span className="block text-xs text-inkmuted">Tap to see the full schedule and join links</span>
          </span>
          <span className="shrink-0 text-sm font-semibold" style={{ color: accent }}>View →</span>
        </button>
      )}
    </div>
  );
}

function LessonContent({ lesson, accent, courseId, watermark, cover, onSubmitted }) {
  const type = lesson.type || "video";
  const [showQuizModal, setShowQuizModal] = useState(false);

  if (type === "text") {
    return (
      <div className="sc-protected mt-4 space-y-4">
        {lesson.text && <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{lesson.text}</p>}
        {(lesson.images || []).map((src, i) => (
          <img key={i} src={src} alt="" draggable={false} className="pointer-events-none w-full rounded-2xl border border-line" />
        ))}
      </div>
    );
  }
  if (type === "notes") {
    return <SecureNotes lesson={lesson} courseId={courseId} accent={accent} watermark={watermark} />;
  }
  if (type === "audio") {
    return <SecureAudio lesson={lesson} courseId={courseId} watermark={watermark} />;
  }
  if (type === "assignment") {
    const due = lesson.dueDate ? new Date(lesson.dueDate) : null;
    const overdue = due && due < new Date();
    return (
      <div className="mt-4 space-y-4">
        <div className="rounded-2xl border border-line bg-paper p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-inkmuted">Assignment</span>
            {lesson.maxMarks ? <span className="pill bg-white text-inkmuted">{lesson.maxMarks} marks</span> : null}
            {due && (
              <span className={`pill ${overdue ? "bg-red-50 text-danger" : "bg-[#FEF3C7] text-[#92600A]"}`}>
                {overdue ? "Was due" : "Due"} {due.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{lesson.prompt || "Your instructor will share the assignment details."}</p>
          {(lesson.attachments || []).length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wide text-inkmuted">Reference files</div>
              {lesson.attachments.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold hover:border-brand">
                  <span>{isDriveUrl(f.url) ? "🔗" : "📎"}</span>
                  <span className="min-w-0 flex-1 truncate">{f.name || `File ${i + 1}`}</span>
                  <span className="shrink-0 text-xs" style={{ color: accent }}>Open ↗</span>
                </a>
              ))}
            </div>
          )}
        </div>
        <AssignmentSubmission
          courseId={courseId}
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          allowUpload={lesson.allowUpload !== false}
          allowLink={lesson.allowLink !== false}
          maxMarks={lesson.maxMarks}
          onSubmitted={onSubmitted}
        />
      </div>
    );
  }
  if (type === "quiz") {
    return (
      <>
        <div className="mt-4 rounded-2xl border border-line bg-paper p-6 text-center">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="font-display text-xl font-bold text-ink">Quiz Time!</h3>
          <p className="text-sm text-inkmuted mt-1 mb-4">{lesson.questions?.length || 0} questions to test your knowledge</p>
          <button onClick={() => setShowQuizModal(true)} className="btn text-white" style={{ background: accent }}>
            Start Quiz
          </button>
        </div>
        {showQuizModal && (
          <QuizModal lesson={lesson} accent={accent} onClose={() => setShowQuizModal(false)} />
        )}
      </>
    );
  }
  // video (default) — signed URL + watermark, no download affordances.
  // `cover` is the course artwork, used as the poster frame when the lesson
  // has no thumbnail of its own.
  return <SecureVideo lesson={lesson} courseId={courseId} accent={accent} watermark={watermark} cover={cover} />;
}

/** Full live-class schedule, opened from the sidebar. Meet/Zoom opens in a
    new tab; YouTube Live plays right here (with optional live chat). */
function LiveClasses({ classes, accent }) {
  const { upcoming, past } = splitLive(classes);
  const [watching, setWatching] = useState(null); // session id playing inline
  const fmt = (d) => new Date(d).toLocaleString("en-IN", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  });
  const host = typeof window !== "undefined" ? window.location.hostname : "";

  const Card = ({ s, dim }) => {
    const soon = s.datetime && new Date(s.datetime) - Date.now() < 30 * 60 * 1000 && new Date(s.datetime) > Date.now() - 2 * 60 * 60 * 1000;
    const yt = ytId(s.youtubeUrl);
    const meet = s.link && s.link.trim();
    const open = watching === s.id && yt;
    return (
      <div className={`card p-4 ${dim && !open ? "opacity-70" : ""}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold">{s.title || "Live session"}</span>
              {soon && <span className="pill bg-danger/10 text-danger">Starting soon</span>}
              {yt && <span className="pill bg-red-50 text-[#c4302b]">▶ YouTube Live</span>}
              {meet && <span className="pill bg-brand-soft text-brand">{/zoom\./i.test(s.link) ? "Zoom" : /meet\.google/i.test(s.link) ? "Google Meet" : "Meeting link"}</span>}
            </div>
            {s.datetime
              ? <div className="mt-0.5 text-xs text-inkmuted">{fmt(s.datetime)}</div>
              : <div className="mt-0.5 text-xs text-inkmuted">Time to be announced</div>}
            {s.description && <p className="mt-1.5 whitespace-pre-wrap text-sm text-inkmuted">{s.description}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {yt && (
              <button onClick={() => setWatching(open ? null : s.id)} className="btn text-white" style={{ background: dim ? "#6B7280" : "#c4302b" }}>
                {open ? "Close player" : dim ? "▶ Watch recording" : "▶ Watch live"}
              </button>
            )}
            {meet && (
              <a href={s.link} target="_blank" rel="noopener noreferrer" className="btn text-white" style={{ background: dim ? "#9AA3AF" : accent }}>
                {dim ? "Recording / link" : "Join meeting"}
              </a>
            )}
            {!yt && !meet && <span className="text-xs text-inkmuted">Link coming soon</span>}
          </div>
        </div>
        {open && (
          <div className={`mt-4 grid gap-3 ${s.youtubeChat !== false && !dim ? "lg:grid-cols-3" : ""}`}>
            <div className={`aspect-video overflow-hidden rounded-xl bg-black ${s.youtubeChat !== false && !dim ? "lg:col-span-2" : ""}`}>
              <iframe src={`https://www.youtube.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title={s.title || "Live class"} className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            </div>
            {s.youtubeChat !== false && !dim && host && (
              <iframe src={`https://www.youtube.com/live_chat?v=${yt}&embed_domain=${host}`}
                title="Live chat" className="h-[360px] w-full rounded-xl border border-line lg:h-auto" />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="font-display text-2xl font-bold">Live classes</h2>
      <p className="mt-1 text-sm text-inkmuted">Join sessions scheduled by your instructor — YouTube Live plays right here.</p>

      {classes.length === 0 && (
        <div className="card mt-6 p-8 text-center text-sm text-inkmuted">No live classes scheduled yet.</div>
      )}

      {upcoming.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wide text-inkmuted">Upcoming</h3>
          <div className="mt-3 space-y-2">{upcoming.map((s) => <Card key={s.id} s={s} />)}</div>
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-bold uppercase tracking-wide text-inkmuted">Past</h3>
          <div className="mt-3 space-y-2">{past.map((s) => <Card key={s.id} s={s} dim />)}</div>
        </div>
      )}
    </div>
  );
}

/** Every assignment in the course with its due date and my status. */
function AssignmentsOverview({ items, subs, accent, onGo }) {
  const status = (a) => {
    const sub = subs[a.id];
    if (sub?.marked) return { label: `Graded ${sub.marks_obtained}/${sub.marks_total}`, cls: "bg-teal-soft text-teal" };
    if (sub) return { label: "Submitted · awaiting review", cls: "bg-[#FEF3C7] text-[#92600A]" };
    if (a.dueDate && new Date(a.dueDate) < new Date()) return { label: "Overdue", cls: "bg-red-50 text-danger" };
    return { label: "Not submitted", cls: "bg-paper text-inkmuted" };
  };
  const done = items.filter((a) => subs[a.id]).length;
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="font-display text-2xl font-bold">Assignments</h2>
      <p className="mt-1 text-sm text-inkmuted">{done} of {items.length} submitted</p>
      <div className="mt-5 space-y-2">
        {items.map((a) => {
          const st = status(a);
          return (
            <button key={a.id} onClick={() => onGo(a.id)} className="card flex w-full flex-wrap items-center gap-3 p-4 text-left hover:border-brand">
              <span className="text-xl">📝</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{a.title || "Assignment"}</span>
                <span className="block text-xs text-inkmuted">
                  {a.dueDate ? `Due ${new Date(a.dueDate).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "No due date"}
                  {a.maxMarks ? ` · ${a.maxMarks} marks` : ""}
                </span>
              </span>
              <span className={`pill shrink-0 ${st.cls}`}>{st.label}</span>
              <span className="shrink-0 text-sm font-semibold" style={{ color: accent }}>Open →</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


function NextBtn({ lessons, current, onGo }) {
  const i = lessons.findIndex((l) => l.id === current.id);
  const next = lessons[i + 1];
  if (!next) return null;
  return <button onClick={() => onGo(next.id)} className="btn-ghost">Next: {next.title} →</button>;
}

function Gate({ title, body, cta, onCta }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="max-w-sm text-sm text-inkmuted">{body}</p>
      <button onClick={onCta} className="btn-ink mt-3">{cta}</button>
    </div>
  );
}