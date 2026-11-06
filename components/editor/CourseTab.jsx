"use client";
import { useState } from "react";
import { Field, RadioCard, SectionCard, Switch } from "@/components/ui";
import { uid, uploadImage, uploadVideo, uploadSecureMedia, videoThumb } from "@/lib/courseModel";
import { useAuth } from "@/components/AuthProvider";
import MathFormulaToolbar from "@/components/editor/MathFormulaToolbar";
import { LatexText } from "@/components/editor/LatexRenderer";
import QuizBuilder from "@/components/editor/QuizBuilder";
import LinkAdd from "@/components/LinkAdd";
import { linkLabel, isDriveUrl } from "@/lib/driveLink";

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
  if (type === "assignment") return { ...base, prompt: "", allowUpload: true, allowLink: true, dueDate: "", maxMarks: 100, attachments: [] };
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
        <p className="mt-1 text-xs text-inkmuted">
          Weekend webinars, AMAs, doubt-clearing sessions. Add a Google Meet / Zoom link, a YouTube Live link, or both —
          YouTube Live plays right inside the course, Meet/Zoom opens in a new tab. Links unlock for buyers only.
        </p>
        <div className="mt-3 space-y-3">
          {live.map((s, i) => {
            const set = (p) => setLive(live.map((x, j) => j === i ? { ...x, ...p } : x));
            const platform = s.platform || (s.youtubeUrl && s.link ? "both" : s.youtubeUrl ? "youtube" : "meet");
            return (
              <div key={s.id} className="rounded-card border border-line p-3">
                <input className="input mb-2" placeholder="Session title" value={s.title}
                  onChange={(e) => set({ title: e.target.value })} />
                <input className="input mb-2" type="datetime-local" value={s.datetime}
                  onChange={(e) => set({ datetime: e.target.value })} />
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {[["meet", "📹 Meet / Zoom"], ["youtube", "▶️ YouTube Live"], ["both", "Both"]].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => set({ platform: v })}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${platform === v ? "border-brand bg-brand-soft text-brand" : "border-line text-inkmuted hover:text-ink"}`}>{l}</button>
                  ))}
                </div>
                {(platform === "meet" || platform === "both") && (
                  <input className="input mb-2" placeholder="Google Meet / Zoom link" value={s.link || ""}
                    onChange={(e) => set({ link: e.target.value })} />
                )}
                {(platform === "youtube" || platform === "both") && (
                  <>
                    <input className="input mb-1" placeholder="YouTube Live link — e.g. https://youtube.com/live/abc123" value={s.youtubeUrl || ""}
                      onChange={(e) => set({ youtubeUrl: e.target.value })} />
                    <p className="mb-2 text-[11px] text-inkmuted">
                      Schedule the stream in YouTube Studio as <b>Unlisted</b>, then paste its link. The same link becomes the recording after the class.
                    </p>
                    <label className="mb-2 flex items-center gap-2 text-xs font-semibold">
                      <input type="checkbox" className="accent-brand" checked={s.youtubeChat !== false} onChange={(e) => set({ youtubeChat: e.target.checked })} />
                      Show YouTube live chat next to the stream
                    </label>
                  </>
                )}
                <textarea className="input min-h-[60px]" placeholder="What's this session about? (optional)" value={s.description || ""}
                  onChange={(e) => set({ description: e.target.value })} />
                <button type="button" className="mt-2 text-xs font-semibold text-danger" onClick={() => setLive(live.filter((_, j) => j !== i))}>Remove</button>
              </div>
            );
          })}
          <button type="button" className="btn-ghost" onClick={() => setLive([...live, { id: uid(), title: "", datetime: "", platform: "meet", link: "", youtubeUrl: "", youtubeChat: true, description: "" }])}>Set up a live class</button>
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

/**
 * Thumbnail for one video lesson. Shows what the learner will actually see:
 * the uploaded cover, or the auto-derived YouTube/Vimeo still.
 */
function LessonCoverField({ lesson, onChange, userId }) {
  const [busy, setBusy] = useState(false);
  const auto = videoThumb(lesson.videoUrl);
  const shown = lesson.coverImage || auto;

  async function upload(file) {
    if (!file) return;
    setBusy(true);
    try { onChange({ coverImage: await uploadImage(userId, file) }); }
    catch (e) { alert("Upload failed: " + e.message); }
    finally { setBusy(false); }
  }

  return (
    <Field label="Cover image (optional)" hint="Shown before the video plays — 16:9 works best">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-paper text-xs text-inkmuted">
          {shown ? <img src={shown} alt="" className="h-full w-full object-cover" /> : "No cover"}
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-y-2">
          <label className="btn-ghost cursor-pointer">
            {busy ? "Uploading…" : lesson.coverImage ? "Replace" : "Upload cover"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          <LinkAdd kind="image" label="🔗 Drive link" className="ml-2" onAdd={(url) => onChange({ coverImage: url })} />
          {lesson.coverImage
            ? <button type="button" onClick={() => onChange({ coverImage: "" })} className="ml-2 text-xs font-semibold text-danger">Remove</button>
            : auto && <span className="ml-2 text-xs text-inkmuted">Using the video&rsquo;s own thumbnail</span>}
        </div>
      </div>
    </Field>
  );
}

/* ---------------- Per-type lesson body editors ---------------- */
function LessonBody({ lesson, onChange, userId }) {
  const [videoUploading, setVideoUploading] = useState(false);
  const [audioUploading, setAudioUploading] = useState(false);
  const [notesUploading, setNotesUploading] = useState(false);
  const type = lesson.type || "video";

  // A notes lesson can hold MANY files. Older lessons kept a single
  // mediaPath/fileName — treat that as a one-item list for back-compat.
  const notesFiles = lesson.files?.length
    ? lesson.files
    : (lesson.mediaPath ? [{ mediaPath: lesson.mediaPath, fileName: lesson.fileName, fileType: lesson.fileType }] : []);

  const syncNotes = (files) =>
    onChange({ files, mediaPath: files[0]?.mediaPath || "", fileName: files[0]?.fileName || "", fileType: files[0]?.fileType || "" });

  const handleNotesUpload = async (fileList) => {
    const arr = Array.from(fileList || []);
    if (!arr.length) return;
    setNotesUploading(true);
    try {
      // Private bucket -> we keep a path, never a public URL.
      const added = [];
      for (const file of arr) {
        const path = await uploadSecureMedia(userId, file, "notes");
        added.push({ mediaPath: path, fileName: file.name, fileType: file.type });
      }
      syncNotes([...notesFiles, ...added]);
    } catch (error) {
      alert("Failed to upload notes: " + error.message);
    } finally {
      setNotesUploading(false);
    }
  };
  const removeNote = (idx) => syncNotes(notesFiles.filter((_, i) => i !== idx));
  
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
      // Private bucket: learners stream it through /api/learn/stream and
      // never get a downloadable URL.
      const path = await uploadSecureMedia(userId, file, "audio");
      onChange({ audioPath: path, audioFile: file.name, audioUrl: "", fileType: file.type || "audio/mpeg" });
    } catch (error) {
      alert("Failed to upload audio: " + error.message);
    } finally {
      setAudioUploading(false);
    }
  };

  if (type === "video") {
    return (
      <>
        <Field label="Video URL" hint="YouTube / Vimeo / Google Drive / direct .mp4 link">
          <input className="input" placeholder="https://youtu.be/…" value={lesson.videoUrl || ""} onChange={(e) => onChange({ videoUrl: e.target.value })} />
        </Field>
        <p className="-mt-1 text-xs text-inkmuted">
          YouTube links play in SuperCreators&rsquo; own player — no YouTube logo, title bar or
          &ldquo;Watch on YouTube&rdquo; button. Google Drive videos must be shared as
          &ldquo;Anyone with the link&rdquo;.
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

        {/* Cover image = the poster frame learners see before they hit play.
            Left blank, the player falls back to the video's own thumbnail and
            then to the course cover, so this is purely optional. */}
        <div className="mt-3">
          <LessonCoverField lesson={lesson} onChange={onChange} userId={userId} />
        </div>

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
        <Field label="Audio URL" hint="Direct .mp3 / .m4a link, hosted audio, or a public Google Drive link">
          <input className="input" placeholder="https://…/audio.mp3" value={lesson.audioUrl || ""} onChange={(e) => onChange({ audioUrl: e.target.value, audioPath: "", audioFile: "" })} />
        </Field>
        <div className="my-3 flex items-center gap-3"><span className="text-xs text-inkmuted">OR</span><span className="h-px flex-1 bg-line" /></div>
        <Field label="Upload Audio" hint="Max 500 MB (.mp3, .m4a, .wav, .ogg)">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line bg-paper/60 px-6 py-6 text-center hover:border-brand">
            <span className="text-2xl">🎙️</span>
            <span className="text-sm"><span className="font-semibold text-brand">Upload</span> or drag & drop</span>
            {audioUploading && <span className="text-xs text-inkmuted">Uploading…</span>}
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleAudioUpload(e.target.files?.[0])} disabled={audioUploading} />
          </label>
          {(lesson.audioPath || lesson.audioFile) && (
            <p className="mt-2 text-xs text-teal">
              ✓ Audio uploaded{typeof lesson.audioFile === "string" && !/^https?:/.test(lesson.audioFile) ? ` — ${lesson.audioFile}` : ""}
              {lesson.audioPath && " · protected (stream only)"}
              <button type="button" className="ml-2 font-semibold text-danger" onClick={() => onChange({ audioPath: "", audioFile: "", audioUrl: "" })}>Remove</button>
            </p>
          )}
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
    return <AssignmentEditor lesson={lesson} onChange={onChange} userId={userId} />;
  }
  if (type === "notes") {
    return (
      <div className="space-y-3">
        <Field label="Notes files (PDF recommended) — add as many as you like">
          <div className="space-y-2">
            {notesFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5">
                <span className="text-lg">{f.driveUrl ? "🔗" : "📚"}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.fileName || `File ${i + 1}`}</span>
                {f.driveUrl && <span className="shrink-0 rounded bg-paper px-1.5 py-0.5 text-[10px] font-semibold uppercase text-inkmuted">link</span>}
                <button type="button" className="shrink-0 text-xs font-semibold text-danger" onClick={() => removeNote(i)}>Remove</button>
              </div>
            ))}
            <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line px-3 py-6 text-sm text-inkmuted hover:border-brand hover:text-brand ${notesUploading ? "opacity-60" : ""}`}>
              <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.epub" multiple className="hidden"
                onChange={(e) => handleNotesUpload(e.target.files)} disabled={notesUploading} />
              {notesUploading ? "Uploading…" : (notesFiles.length ? "📎 Add more files (max 50 MB each)" : "📎 Upload notes (max 50 MB each)")}
            </label>
            <LinkAdd kind="doc" label="🔗 Add a Google Drive / Docs link instead" className="w-full"
              buttonClassName="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-semibold text-inkmuted hover:border-brand hover:text-brand"
              onAdd={(url, raw) => syncNotes([...notesFiles, { driveUrl: url, fileName: linkLabel(raw), fileType: "link" }])} />
            {notesFiles.some((f) => f.driveUrl) && (
              <p className="text-[11px] text-inkmuted">
                Drive links open in Google&rsquo;s viewer. To stop downloads/printing of a Drive file, also turn on
                Drive&rsquo;s own &ldquo;Viewers can&rsquo;t download&rdquo; setting (Share → ⚙).
              </p>
            )}
          </div>
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

/* ---------------- Assignment editor (also used by the Assignments tab) ---------------- */
export function AssignmentEditor({ lesson, onChange, userId }) {
  const [busy, setBusy] = useState(false);
  const files = lesson.attachments || [];

  async function upload(list) {
    const arr = Array.from(list || []);
    if (!arr.length) return;
    setBusy(true);
    try {
      const added = [];
      for (const f of arr) {
        if (f.size > 25 * 1024 * 1024) throw new Error(`${f.name} is over 25 MB — use a Google Drive link instead.`);
        added.push({ url: await uploadImage(userId, f), name: f.name });
      }
      onChange({ attachments: [...files, ...added] });
    } catch (e) { alert("Upload failed: " + e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <Field label="Assignment prompt">
        <textarea className="input min-h-[120px]" placeholder="Describe the task learners must complete…" value={lesson.prompt || ""} onChange={(e) => onChange({ prompt: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Due date (optional)">
          <input className="input" type="datetime-local" value={lesson.dueDate || ""} onChange={(e) => onChange({ dueDate: e.target.value })} />
        </Field>
        <Field label="Maximum marks">
          <input className="input" type="number" min="1" value={lesson.maxMarks ?? 100} onChange={(e) => onChange({ maxMarks: Math.max(1, Number(e.target.value) || 1) })} />
        </Field>
      </div>

      <Field label="Reference files for learners (optional)" hint="Worksheets, question papers, sample answers">
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2">
              <span>{isDriveUrl(f.url) ? "🔗" : "📎"}</span>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm font-semibold text-brand hover:underline">{f.name || f.url}</a>
              <button type="button" className="shrink-0 text-xs font-semibold text-danger" onClick={() => onChange({ attachments: files.filter((_, j) => j !== i) })}>Remove</button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <label className="btn-ghost cursor-pointer text-xs">
              {busy ? "Uploading…" : "📎 Upload file"}
              <input type="file" multiple className="hidden" disabled={busy} onChange={(e) => upload(e.target.files)} />
            </label>
            <LinkAdd kind="file" label="🔗 Drive link" onAdd={(url, raw) => onChange({ attachments: [...files, { url, name: linkLabel(raw) }] })} />
          </div>
        </div>
      </Field>

      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5">
        <div>
          <div className="text-sm font-semibold">Allow file upload</div>
          <div className="text-xs text-inkmuted">Learners can submit their work as a file</div>
        </div>
        <Switch on={lesson.allowUpload !== false} onChange={(v) => onChange({ allowUpload: v })} />
      </div>
      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5">
        <div>
          <div className="text-sm font-semibold">Allow Google Drive link submissions</div>
          <div className="text-xs text-inkmuted">Learners can paste a public Drive / Docs link instead of uploading</div>
        </div>
        <Switch on={lesson.allowLink !== false} onChange={(v) => onChange({ allowLink: v })} />
      </div>
    </div>
  );
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
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => setShowBuilder(true)} className="btn btn-brand">
            + Create Questions
          </button>
          <button onClick={() => setShowBuilder("import")} className="btn btn-ghost">
            📄 Import from Word / Google Doc
          </button>
        </div>
        <p className="mt-3 text-xs text-inkmuted">Type the quiz in any document — numbered questions, lettered options, &ldquo;Answer: b&rdquo; — and upload it.</p>
        {showBuilder && (
          <QuizBuilder
            lesson={lesson}
            onChange={onChange}
            userId={userId}
            initialImport={showBuilder === "import"}
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
      <div className="flex flex-wrap items-center gap-2">
        {image && <img src={image} alt="" className="h-12 w-12 rounded-lg border border-line object-cover" />}
        <label className="btn-ghost cursor-pointer text-xs">{busy ? "Uploading…" : image ? "Replace" : (compact ? "+ Image" : "+ Upload image")}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => up(e.target.files)} />
        </label>
        <LinkAdd kind="image" label="🔗 Link" onAdd={(url) => onChange(url)} />
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
        <LinkAdd kind="image" label="🔗 Drive link" onAdd={(url) => onChange([...images, url])} />
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