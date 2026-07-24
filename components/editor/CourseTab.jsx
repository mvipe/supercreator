"use client";
import { useState } from "react";
import { Field, RadioCard, SectionCard, Switch } from "@/components/ui";
import { uid, uploadImage, uploadVideo, uploadSecureMedia } from "@/lib/courseModel";
import { useAuth } from "@/components/AuthProvider";
import MathFormulaToolbar from "@/components/editor/MathFormulaToolbar";
import { LatexText } from "@/components/editor/LatexRenderer";
import QuizBuilder from "@/components/editor/QuizBuilder";

const LESSON_TYPES = [
  { type: "video", icon: "🎬", title: "Video", desc: "Engage learners with engaging and impactful video lessons." },
  { type: "text", icon: "📄", title: "Text & Images", desc: "A reading lesson presented with text and images." },
  { type: "audio", icon: "🎙️", title: "Audio", desc: "Teach concepts seamlessly with audio-based storytelling." },
  { type: "quiz", icon: "🏅", title: "Quiz", desc: "Test knowledge with auto-graded quiz questions." },
  { type: "assignment", icon: "📝", title: "Assignment", desc: "Encourage deeper learning with mentor-graded assignments." },
  { type: "notes", icon: "📚", title: "Notes / PDF", desc: "Share notes learners read in-app. You choose if they can download." }
];

function newLesson(type, n) {
  const base = { id: uid(), type, title: `Lesson ${n}`, published: true, freePreview: false };
  if (type === "video") return { ...base, videoUrl: "", text: "" };
  if (type === "text") return { ...base, text: "", images: [] };
  if (type === "audio") return { ...base, audioUrl: "", text: "" };
  // Start with no questions — the builder shows a "Create first question"
  // empty state instead of dumping a pre-made blank question on the creator.
  if (type === "quiz") return { ...base, title: "", quizTitle: `Quiz ${n}`, questions: [] };
  if (type === "assignment") return { ...base, prompt: "", allowUpload: true };
  // allowDownload defaults OFF — protecting notes is the whole point of the
  // type, so opting IN to downloads should be a deliberate choice.
  if (type === "notes") return { ...base, mediaPath: "", fileName: "", fileType: "", allowDownload: false, text: "" };
  return base;
}

export default function CourseTab({ course, patch }) {
  const { user } = useAuth();
  const [openLesson, setOpenLesson] = useState(null);
  const [pickerFor, setPickerFor] = useState(null); // module index for the "Add a lesson" modal
  const mods = course.modules;
  const setMods = (modules) => patch({ modules });
  const pr = course.pricing;
  const setPr = (p) => patch({ pricing: { ...pr, ...p } });
  const va = course.validity;
  const setVa = (v) => patch({ validity: { ...va, ...v } });
  const live = course.settings.liveClasses || [];
  const setLive = (liveClasses) => patch({ settings: { ...course.settings, liveClasses } });

  const move = (arr, i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const copy = [...arr];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  };

  const updateLesson = (mi, li, p) =>
    setMods(mods.map((m, i) => i !== mi ? m : { ...m, lessons: m.lessons.map((l, j) => j !== li ? l : { ...l, ...p }) }));

  function addLesson(type) {
    const mi = pickerFor;
    const nl = newLesson(type, mods[mi].lessons.length + 1);
    setMods(mods.map((x, i) => i === mi ? { ...x, lessons: [...x.lessons, nl] } : x));
    setPickerFor(null);
    setOpenLesson(nl.id);
  }

  const typeMeta = (t) => LESSON_TYPES.find((x) => x.type === t) || LESSON_TYPES[0];

  return (
    <div className="space-y-8">
      {/* ---------- Syllabus ---------- */}
      <div>
        <h2 className="font-display text-xl font-bold">Course syllabus</h2>
        <div className="mt-4 space-y-4">
          {mods.map((m, mi) => (
            <div key={m.id} className="card p-4">
              <div className="flex items-center gap-2">
                <input className="input font-semibold" value={m.title}
                  onChange={(e) => setMods(mods.map((x, i) => i === mi ? { ...x, title: e.target.value } : x))} />
                <RowBtns
                  onUp={() => setMods(move(mods, mi, -1))}
                  onDown={() => setMods(move(mods, mi, 1))}
                  onDelete={() => confirm("Delete this module and its lessons?") && setMods(mods.filter((_, i) => i !== mi))} />
              </div>
              <div className="mt-3 space-y-2">
                {m.lessons.map((l, li) => {
                  const open = openLesson === l.id;
                  const tm = typeMeta(l.type || "video");
                  return (
                    <div key={l.id} className="rounded-card border border-line">
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <button type="button" onClick={() => setOpenLesson(open ? null : l.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            className={`shrink-0 text-inkmuted transition-transform ${open ? "rotate-90" : ""}`}><path d="M9 5l7 7-7 7" /></svg>
                          <span className="shrink-0">{tm.icon}</span>
                          <span className="truncate text-sm font-medium">{l.type === "quiz" ? l.quizTitle || "Quiz" : l.title || "Untitled lesson"}</span>
                          <span className="shrink-0 rounded bg-paper px-1.5 py-0.5 text-[10px] font-semibold uppercase text-inkmuted">{tm.title}</span>
                        </button>
                        <span className={`pill ${l.published ? "bg-teal-soft text-teal" : "bg-paper text-inkmuted"}`}>{l.published ? "Published" : "Draft"}</span>
                        <RowBtns
                          onUp={() => setMods(mods.map((x, i) => i === mi ? { ...x, lessons: move(x.lessons, li, -1) } : x))}
                          onDown={() => setMods(mods.map((x, i) => i === mi ? { ...x, lessons: move(x.lessons, li, 1) } : x))}
                          onDelete={() => confirm("Delete this lesson?") && setMods(mods.map((x, i) => i === mi ? { ...x, lessons: x.lessons.filter((_, j) => j !== li) } : x))} />
                      </div>
                      {open && (
                        <div className="space-y-3 border-t border-line bg-paper/50 px-3 py-3">
                          {l.type === "quiz" ? (
                            <Field label="Quiz title"><input className="input" value={l.quizTitle || ""} onChange={(e) => updateLesson(mi, li, { quizTitle: e.target.value })} /></Field>
                          ) : (
                            <Field label="Lesson title"><input className="input" value={l.title} onChange={(e) => updateLesson(mi, li, { title: e.target.value })} /></Field>
                          )}

                          <LessonBody lesson={l} onChange={(p) => updateLesson(mi, li, p)} userId={user?.id} />

                          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5">
                            <span className="text-sm font-semibold">Published</span>
                            <Switch on={l.published} onChange={(v) => updateLesson(mi, li, { published: v })} />
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5">
                            <div>
                              <div className="text-sm font-semibold">Free preview</div>
                              <div className="text-xs text-inkmuted">Anyone can access this lesson without buying</div>
                            </div>
                            <Switch on={l.freePreview} onChange={(v) => updateLesson(mi, li, { freePreview: v })} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button type="button" className="text-sm font-semibold text-brand" onClick={() => setPickerFor(mi)}>+ Add lesson</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn-ghost w-full"
            onClick={() => setMods([...mods, { id: uid(), title: `Module ${mods.length + 1}`, lessons: [] }])}>+ New module</button>
        </div>
      </div>

      {/* ---------- Live classes ---------- */}
      <SectionCard title="Live classes (optional)">
        <p className="mt-1 text-xs text-inkmuted">Weekend webinars, AMAs, doubt-clearing sessions — the join link unlocks for buyers.</p>
        <div className="mt-3 space-y-3">
          {live.map((s, i) => (
            <div key={s.id} className="rounded-card border border-line p-3">
              <input className="input mb-2" placeholder="Session title" value={s.title}
                onChange={(e) => setLive(live.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="datetime-local" value={s.datetime}
                  onChange={(e) => setLive(live.map((x, j) => j === i ? { ...x, datetime: e.target.value } : x))} />
                <input className="input" placeholder="Meet / Zoom link" value={s.link}
                  onChange={(e) => setLive(live.map((x, j) => j === i ? { ...x, link: e.target.value } : x))} />
              </div>
              <button type="button" className="mt-2 text-xs font-semibold text-danger" onClick={() => setLive(live.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
          <button type="button" className="btn-ghost" onClick={() => setLive([...live, { id: uid(), title: "", datetime: "", link: "" }])}>Set up a live class</button>
        </div>
      </SectionCard>

      {/* ---------- Pricing ---------- */}
      <div>
        <h2 className="font-display text-xl font-bold">Pricing</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <RadioCard checked={pr.mode === "fixed"} title="Fixed price" desc="Charge a one-time fixed amount" onClick={() => setPr({ mode: "fixed" })} />
          <RadioCard checked={pr.mode === "pwyw"} title="Customer decides" desc="Let buyers pay what they want" onClick={() => setPr({ mode: "pwyw" })} />
          <RadioCard checked={pr.mode === "free"} title="Free" desc="Allow access for free" onClick={() => setPr({ mode: "free" })} />
        </div>
        {pr.mode === "fixed" && (
          <div className="mt-4 space-y-4">
            <Field label="Price" required>
              <div className="flex overflow-hidden rounded-[10px] border border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                <span className="flex items-center border-r border-line bg-paper px-3 text-sm font-semibold text-inkmuted">₹</span>
                <input className="w-full px-3.5 py-2.5 text-sm outline-none" type="number" min="1" value={pr.price}
                  onChange={(e) => setPr({ price: Number(e.target.value) })} />
              </div>
            </Field>
            <div className="flex items-center gap-3">
              <input id="disc" type="checkbox" className="h-4 w-4 accent-brand" checked={pr.discountEnabled}
                onChange={(e) => setPr({ discountEnabled: e.target.checked })} />
              <label htmlFor="disc" className="text-sm font-semibold">Offer discounted price</label>
            </div>
            {pr.discountEnabled && (
              <Field label="Discounted price" hint="Shown with the original price struck through">
                <input className="input" type="number" min="0" value={pr.discountPrice} onChange={(e) => setPr({ discountPrice: Number(e.target.value) })} />
              </Field>
            )}
          </div>
        )}
        {pr.mode === "pwyw" && (
          <div className="mt-4">
            <Field label="Minimum price" required hint="Buyers can pay this or more">
              <input className="input" type="number" min="1" value={pr.minPrice} onChange={(e) => setPr({ minPrice: Number(e.target.value) })} />
            </Field>
          </div>
        )}
      </div>

      {/* ---------- Validity ---------- */}
      <div>
        <h2 className="font-display text-xl font-bold">Course validity</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <RadioCard checked={va.mode === "lifetime"} title="Lifetime access" desc="Buyers keep access forever" onClick={() => setVa({ mode: "lifetime" })} />
          <RadioCard checked={va.mode === "limited"} title="Limited period" desc="Access expires after a set number of days" onClick={() => setVa({ mode: "limited" })} />
        </div>
        {va.mode === "limited" && (
          <div className="mt-4">
            <Field label="Access duration (days)" required>
              <input className="input" type="number" min="1" value={va.days} onChange={(e) => setVa({ days: Number(e.target.value) })} />
            </Field>
          </div>
        )}
      </div>

      {/* ---------- Add-a-lesson picker modal ---------- */}
      {pickerFor !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPickerFor(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Add a Lesson</h3>
              <button onClick={() => setPickerFor(null)} className="rounded-lg p-1 text-inkmuted hover:bg-paper" aria-label="Close">✕</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {LESSON_TYPES.map((t) => (
                <button key={t.type} onClick={() => addLesson(t.type)}
                  className="flex items-start gap-3 rounded-xl border border-line p-4 text-left transition-all hover:border-brand hover:shadow-sm">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xl">{t.icon}</span>
                  <div>
                    <div className="font-display text-base font-bold">{t.title}</div>
                    <div className="mt-0.5 text-xs text-inkmuted">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Per-type lesson body editors ---------------- */
function LessonBody({ lesson, onChange, userId }) {
  const [videoUploading, setVideoUploading] = useState(false);
  const [audioUploading, setAudioUploading] = useState(false);
  const [notesUploading, setNotesUploading] = useState(false);
  const type = lesson.type || "video";

  const handleNotesUpload = async (file) => {
    if (!file) return;
    setNotesUploading(true);
    try {
      // Private bucket -> we keep a path, never a public URL.
      const path = await uploadSecureMedia(userId, file, "notes");
      onChange({ mediaPath: path, fileName: file.name, fileType: file.type });
    } catch (error) {
      alert("Failed to upload notes: " + error.message);
    } finally {
      setNotesUploading(false);
    }
  };
  
  const handleVideoUpload = async (file) => {
    if (!file) return;
    setVideoUploading(true);
    try {
      const url = await uploadVideo(userId, file);
      onChange({ videoFile: url, videoUrl: url });
    } catch (error) {
      alert("Failed to upload video: " + error.message);
    } finally {
      setVideoUploading(false);
    }
  };

  const handleAudioUpload = async (file) => {
    if (!file) return;
    setAudioUploading(true);
    try {
      const url = await uploadVideo(userId, file);
      onChange({ audioFile: url, audioUrl: url });
    } catch (error) {
      alert("Failed to upload audio: " + error.message);
    } finally {
      setAudioUploading(false);
    }
  };

  if (type === "video") {
    return (
      <>
        <Field label="Video URL" hint="YouTube / Vimeo / direct .mp4 link">
          <input className="input" placeholder="https://youtu.be/…" value={lesson.videoUrl || ""} onChange={(e) => onChange({ videoUrl: e.target.value })} />
        </Field>
        <p className="-mt-1 text-xs text-inkmuted">
          YouTube links play in SuperCreators&rsquo; own player — no YouTube logo, title bar or
          &ldquo;Watch on YouTube&rdquo; button.
        </p>

        {/* Direct upload is parked for now — paste a URL instead.
            To bring it back, restore this block and the handleVideoUpload
            helper above (uploadSecureMedia(userId, file, "video") puts the
            file in the private bucket and returns a mediaPath).

        <div className="my-3 flex items-center gap-3"><span className="text-xs text-inkmuted">OR</span><span className="h-px flex-1 bg-line" /></div>
        <Field label="Upload Video" hint="Max 500 MB">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line bg-paper/60 px-6 py-6 text-center hover:border-brand">
            <span className="text-2xl">📹</span>
            <span className="text-sm"><span className="font-semibold text-brand">Upload</span> or drag & drop</span>
            {videoUploading && <span className="text-xs text-inkmuted">Uploading…</span>}
            <input type="file" accept="video/*" className="hidden" onChange={(e) => handleVideoUpload(e.target.files?.[0])} disabled={videoUploading} />
          </label>
          {lesson.videoFile && <p className="mt-2 text-xs text-teal">✓ Video uploaded</p>}
        </Field>
        */}

        <div className="mt-3">
          <Field label="Lesson notes (optional)">
            <textarea className="input min-h-[80px]" value={lesson.text || ""} onChange={(e) => onChange({ text: e.target.value })} />
          </Field>
        </div>
      </>
    );
  }
  if (type === "audio") {
    return (
      <>
        <Field label="Audio URL" hint="Direct .mp3 / .m4a link or hosted audio">
          <input className="input" placeholder="https://…/audio.mp3" value={lesson.audioUrl || ""} onChange={(e) => onChange({ audioUrl: e.target.value })} />
        </Field>
        <div className="my-3 flex items-center gap-3"><span className="text-xs text-inkmuted">OR</span><span className="h-px flex-1 bg-line" /></div>
        <Field label="Upload Audio" hint="Max 500 MB (.mp3, .m4a, .wav, .ogg)">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line bg-paper/60 px-6 py-6 text-center hover:border-brand">
            <span className="text-2xl">🎙️</span>
            <span className="text-sm"><span className="font-semibold text-brand">Upload</span> or drag & drop</span>
            {audioUploading && <span className="text-xs text-inkmuted">Uploading…</span>}
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleAudioUpload(e.target.files?.[0])} disabled={audioUploading} />
          </label>
          {lesson.audioFile && <p className="mt-2 text-xs text-teal">✓ Audio uploaded</p>}
        </Field>
        <Field label="Notes (optional)">
          <textarea className="input min-h-[80px]" value={lesson.text || ""} onChange={(e) => onChange({ text: e.target.value })} />
        </Field>
      </>
    );
  }
  if (type === "text") {
    return (
      <>
        <Field label="Lesson content">
          <textarea className="input min-h-[140px]" placeholder="Write your reading lesson…" value={lesson.text || ""} onChange={(e) => onChange({ text: e.target.value })} />
        </Field>
        <ImageList label="Images" images={lesson.images || []} userId={userId} onChange={(images) => onChange({ images })} />
      </>
    );
  }
  if (type === "assignment") {
    return (
      <>
        <Field label="Assignment prompt">
          <textarea className="input min-h-[120px]" placeholder="Describe the task learners must complete…" value={lesson.prompt || ""} onChange={(e) => onChange({ prompt: e.target.value })} />
        </Field>
        <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5">
          <div>
            <div className="text-sm font-semibold">Allow file upload</div>
            <div className="text-xs text-inkmuted">Learners can submit their work as a file</div>
          </div>
          <Switch on={lesson.allowUpload !== false} onChange={(v) => onChange({ allowUpload: v })} />
        </div>
      </>
    );
  }
  if (type === "notes") {
    return (
      <div className="space-y-3">
        <Field label="Notes file (PDF recommended)">
          {lesson.mediaPath ? (
            <div className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5">
              <span className="text-lg">📚</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{lesson.fileName || "Uploaded file"}</span>
              <button type="button" className="shrink-0 text-xs font-semibold text-danger"
                onClick={() => onChange({ mediaPath: "", fileName: "", fileType: "" })}>Remove</button>
            </div>
          ) : (
            <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line px-3 py-6 text-sm text-inkmuted hover:border-brand hover:text-brand ${notesUploading ? "opacity-60" : ""}`}>
              <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.epub" className="hidden"
                onChange={(e) => handleNotesUpload(e.target.files?.[0])} disabled={notesUploading} />
              {notesUploading ? "Uploading…" : "📎 Upload notes (max 50 MB)"}
            </label>
          )}
        </Field>

        <div className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2.5">
          <div className="min-w-0 pr-3">
            <div className="text-sm font-semibold">Allow learners to download</div>
            <div className="text-xs text-inkmuted">
              {lesson.allowDownload
                ? "Learners get a Download button and keep their own copy."
                : "Learners can only read it inside the site — no download button."}
            </div>
          </div>
          <Switch on={!!lesson.allowDownload} onChange={(v) => onChange({ allowDownload: v })} />
        </div>

        <Field label="Description (optional)">
          <textarea className="input min-h-[70px]" value={lesson.text || ""}
            placeholder="Tell learners what these notes cover…"
            onChange={(e) => onChange({ text: e.target.value })} />
        </Field>
      </div>
    );
  }

  if (type === "quiz") {
    return (
      <>
        <QuizBuilderLauncher lesson={lesson} onChange={onChange} userId={userId} />
      </>
    );
  }
  return null;
}

/* ---------------- Quiz builder launcher - opens modern modal builder ---------------- */
function QuizBuilderLauncher({ lesson, onChange, userId }) {
  const [showBuilder, setShowBuilder] = useState(false);
  const questions = lesson.questions || [];

  if (!questions.length) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-paper/50 p-8 text-center">
        <span className="text-2xl block mb-2">🎯</span>
        <p className="text-sm text-inkmuted mb-4">No quiz questions yet</p>
        <button onClick={() => setShowBuilder(true)} className="btn btn-brand">
          + Create Questions
        </button>
        {showBuilder && (
          <QuizBuilder
            lesson={lesson}
            onChange={onChange}
            userId={userId}
            onClose={() => setShowBuilder(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-ink">{questions.length} Questions</div>
            <div className="text-xs text-inkmuted mt-1">
              {questions.filter((q) => q.options?.some((o) => o.correct)).length} have answers marked
            </div>
          </div>
          <button onClick={() => setShowBuilder(true)} className="btn btn-brand">
            Edit Questions
          </button>
        </div>
      </div>

      {showBuilder && (
        <QuizBuilder
          lesson={lesson}
          onChange={onChange}
          userId={userId}
          onClose={() => setShowBuilder(false)}
        />
      )}
    </div>
  );
}

/* -------- old code removed -------- */

/* ---------------- Image upload helpers ---------------- */
function ImageSingle({ label, image, userId, onChange, compact }) {
  const [busy, setBusy] = useState(false);
  async function up(files) {
    if (!files?.[0] || !userId) return;
    setBusy(true);
    try { onChange(await uploadImage(userId, files[0])); } finally { setBusy(false); }
  }
  return (
    <div className={compact ? "mt-2" : "mt-2"}>
      {!compact && <div className="mb-1 text-xs font-semibold text-inkmuted">{label}</div>}
      <div className="flex items-center gap-2">
        {image && <img src={image} alt="" className="h-12 w-12 rounded-lg border border-line object-cover" />}
        <label className="btn-ghost cursor-pointer text-xs">{busy ? "Uploading…" : image ? "Replace" : (compact ? "+ Image" : "+ Upload image")}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => up(e.target.files)} />
        </label>
        {image && <button type="button" className="text-xs text-danger" onClick={() => onChange("")}>Remove</button>}
      </div>
    </div>
  );
}

function ImageList({ label, images, userId, onChange }) {
  const [busy, setBusy] = useState(false);
  async function up(files) {
    if (!files?.length || !userId) return;
    setBusy(true);
    try {
      const urls = [];
      for (const f of files) urls.push(await uploadImage(userId, f));
      onChange([...images, ...urls]);
    } finally { setBusy(false); }
  }
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-inkmuted">{label}</div>
      <div className="flex flex-wrap items-center gap-2">
        {images.map((src, i) => (
          <div key={i} className="relative">
            <img src={src} alt="" className="h-16 w-16 rounded-lg border border-line object-cover" />
            <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs text-white">✕</button>
          </div>
        ))}
        <label className="btn-ghost cursor-pointer text-xs">{busy ? "Uploading…" : "+ Add images"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => up(e.target.files)} />
        </label>
      </div>
    </div>
  );
}

function RowBtns({ onUp, onDown, onDelete }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 text-inkmuted">
      <button type="button" onClick={onUp} className="rounded p-1 hover:bg-paper hover:text-ink" aria-label="Move up">↑</button>
      <button type="button" onClick={onDown} className="rounded p-1 hover:bg-paper hover:text-ink" aria-label="Move down">↓</button>
      <button type="button" onClick={onDelete} className="rounded p-1 hover:bg-red-50 hover:text-danger" aria-label="Delete">✕</button>
    </div>
  );
}