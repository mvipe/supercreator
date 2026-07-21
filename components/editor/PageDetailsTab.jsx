"use client";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Field, SectionCard } from "@/components/ui";
import RichText from "@/components/editor/RichText";
import { uid, uploadImage, uploadVideo } from "@/lib/courseModel";

export default function PageDetailsTab({ course, patch }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const s = course.sections;
  const setSection = (key, val) => patch({ sections: { ...s, [key]: { ...s[key], ...val } } });

  async function onCoverFiles(files) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const f of Array.from(files).slice(0, 10 - (course.coverImages?.length || 0))) {
        if (f.size > 10 * 1024 * 1024) { alert(`${f.name} is over 10 MB`); continue; }
        urls.push(await uploadImage(user.id, f));
      }
      patch({ coverImages: [...(course.coverImages || []), ...urls] });
    } finally { setUploading(false); }
  }

  async function onGalleryFiles(files) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const f of Array.from(files)) urls.push(await uploadImage(user.id, f));
      setSection("gallery", { images: [...(s.gallery.images || []), ...urls] });
    } finally { setUploading(false); }
  }

  return (
    <div className="space-y-7">
      <h2 className="font-display text-xl font-bold">Tell us about your course</h2>

      <Field label="Course title" required counter={`${course.title.length}/75`}>
        <input className="input" maxLength={75} value={course.title} onChange={(e) => patch({ title: e.target.value })} />
      </Field>

      <Field label="Cover images" required hint="1280 × 720 (16:9) recommended · up to 10 MB each · up to 10 images shown as a carousel">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line bg-paper/60 px-6 py-10 text-center hover:border-brand">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" /></svg>
          </span>
          <span className="text-sm"><span className="font-semibold text-brand">Upload</span> or drag & drop</span>
          {uploading && <span className="text-xs text-inkmuted">Uploading…</span>}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onCoverFiles(e.target.files)} />
        </label>
        {course.coverImages?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {course.coverImages.map((u, i) => (
              <div key={u} className="group relative h-16 w-24 overflow-hidden rounded-lg border border-line">
                <img src={u} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => patch({ coverImages: course.coverImages.filter((_, j) => j !== i) })}
                  className="absolute right-1 top-1 hidden rounded bg-black/60 px-1.5 text-xs text-white group-hover:block">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="my-4 flex items-center gap-3 text-xs text-inkmuted"><span className="h-px flex-1 bg-line" />OR<span className="h-px flex-1 bg-line" /></div>
        <input className="input" placeholder="Add a video link (YouTube, Vimeo…)" value={course.coverVideo}
          onChange={(e) => patch({ coverVideo: e.target.value })} />
      </Field>

      <Field label="Description" required>
        <RichText value={course.description} onChange={(v) => patch({ description: v })} />
      </Field>

      <Field label="Button text" required counter={`${course.buttonText.length}/25`}>
        <input className="input" maxLength={25} value={course.buttonText} onChange={(e) => patch({ buttonText: e.target.value })} />
      </Field>

      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold">Optional sections</h3>

        <ListSection title="Course instructions" placeholder="e.g. Download course materials before starting"
          items={s.instructions.items} enabled={s.instructions.enabled}
          onToggle={(v) => setSection("instructions", { enabled: v })}
          onItems={(items) => setSection("instructions", { items })} />

        <ListSection title="Course benefits" placeholder="e.g. 30-day transformation guaranteed"
          items={s.benefits.items} enabled={s.benefits.enabled}
          onToggle={(v) => setSection("benefits", { enabled: v })}
          onItems={(items) => setSection("benefits", { items })} />

        <SectionCard title="About me" on={s.about.enabled} onToggle={(v) => setSection("about", { enabled: v })}>
          {s.about.enabled && (
            <div className="mt-3 space-y-3">
              <textarea className="input min-h-[90px]" placeholder="A short intro about you…" value={s.about.text}
                onChange={(e) => setSection("about", { text: e.target.value })} />
            </div>
          )}
        </SectionCard>

        <SectionCard title="Gallery" on={s.gallery.enabled} onToggle={(v) => setSection("gallery", { enabled: v })}>
          {s.gallery.enabled && (
            <div className="mt-3 space-y-3">
              <input className="input" placeholder="Gallery title (e.g. Our offline work)" value={s.gallery.title}
                onChange={(e) => setSection("gallery", { title: e.target.value })} />
              <div className="flex flex-wrap items-center gap-2">
                {s.gallery.images?.map((u, i) => (
                  <div key={u} className="group relative h-14 w-20 overflow-hidden rounded-lg border border-line">
                    <img src={u} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setSection("gallery", { images: s.gallery.images.filter((_, j) => j !== i) })}
                      className="absolute right-1 top-1 hidden rounded bg-black/60 px-1 text-xs text-white group-hover:block">✕</button>
                  </div>
                ))}
                <label className="flex h-14 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line text-inkmuted hover:border-brand hover:text-brand">
                  + <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onGalleryFiles(e.target.files)} />
                </label>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="FAQ" on={s.faq.enabled} onToggle={(v) => setSection("faq", { enabled: v })}>
          {s.faq.enabled && (
            <div className="mt-3 space-y-3">
              {s.faq.items.map((f, i) => (
                <div key={f.id} className="rounded-card border border-line p-3">
                  <input className="input mb-2" placeholder="Question" value={f.q}
                    onChange={(e) => setSection("faq", { items: s.faq.items.map((x, j) => j === i ? { ...x, q: e.target.value } : x) })} />
                  <textarea className="input min-h-[60px]" placeholder="Answer" value={f.a}
                    onChange={(e) => setSection("faq", { items: s.faq.items.map((x, j) => j === i ? { ...x, a: e.target.value } : x) })} />
                  <button type="button" className="mt-2 text-xs font-semibold text-danger"
                    onClick={() => setSection("faq", { items: s.faq.items.filter((_, j) => j !== i) })}>Remove</button>
                </div>
              ))}
              <button type="button" className="text-sm font-semibold text-brand"
                onClick={() => setSection("faq", { items: [...s.faq.items, { id: uid(), q: "", a: "" }] })}>+ Add question</button>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Testimonials" on={s.testimonials.enabled} onToggle={(v) => setSection("testimonials", { enabled: v })}>
          {s.testimonials.enabled && (
            <div className="mt-3 space-y-3">
              {s.testimonials.items.map((t, i) => (
                <div key={t.id} className="rounded-card border border-line p-3">
                  <input className="input mb-2" placeholder="Name" value={t.name}
                    onChange={(e) => setSection("testimonials", { items: s.testimonials.items.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} />
                  <textarea className="input min-h-[70px]" placeholder="What they said…" value={t.text}
                    onChange={(e) => setSection("testimonials", { items: s.testimonials.items.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })} />
                  <button type="button" className="mt-2 text-xs font-semibold text-danger"
                    onClick={() => setSection("testimonials", { items: s.testimonials.items.filter((_, j) => j !== i) })}>Remove</button>
                </div>
              ))}
              <button type="button" className="text-sm font-semibold text-brand"
                onClick={() => setSection("testimonials", { items: [...s.testimonials.items, { id: uid(), name: "", text: "" }] })}>+ Add testimonial</button>
            </div>
          )}
        </SectionCard>

        <ListSection title="Course highlights" placeholder="e.g. 12 hours of HD video"
          items={s.highlights.items} enabled={s.highlights.enabled}
          onToggle={(v) => setSection("highlights", { enabled: v })}
          onItems={(items) => setSection("highlights", { items })} />
      </div>
    </div>
  );
}

function ListSection({ title, items, enabled, onToggle, onItems, placeholder }) {
  const [draft, setDraft] = useState("");
  return (
    <SectionCard title={title} on={enabled} onToggle={onToggle}>
      {enabled && (
        <div className="mt-3 space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm">
              <span className="flex-1">{it}</span>
              <button type="button" className="text-xs font-semibold text-danger" onClick={() => onItems(items.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { onItems([...items, draft.trim()]); setDraft(""); } }}>
            <input className="input" placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button className="btn-ghost shrink-0" type="submit">+ Add</button>
          </form>
        </div>
      )}
    </SectionCard>
  );
}
