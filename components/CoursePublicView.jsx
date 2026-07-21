"use client";
import { useState } from "react";
import { inr, lessonCount, effectivePrice, ytEmbed } from "@/lib/courseModel";
import { BuiltWithLink, CreatorChip } from "@/components/Branding";

/**
 * Themed course sales page. Used inside the editor's live preview and on /c/[slug].
 * mode: "preview" disables the buy action.
 */
/** Row icon per lesson type — a play triangle for everything was misleading. */
const LESSON_GLYPH = {
  quiz: "🏅",
  notes: "📚",
  text: "📄",
  audio: "🎙️",
  assignment: "📝"
};

export default function CoursePublicView({ course, mode = "live", onBuy, onPreviewLesson, compact = false, creator = null }) {
  const [slide, setSlide] = useState(0);
  const [faqOpen, setFaqOpen] = useState(null);
  const s = course.sections || {};
  const st = course.settings || {};
  const dark = st.theme === "dark";
  const accent = st.accent || "#2E6EF7";
  const covers = course.coverImages || [];
  const price = effectivePrice(course);
  const original = course.pricing?.price || 0;
  const showStrike = course.pricing?.mode === "fixed" && course.pricing?.discountEnabled && price < original;
  const embed = ytEmbed(course.coverVideo);

  const pageBg = dark ? "#141414" : st.theme === "light" ? "#ffffff" : "#FBFAF7";
  const cardBg = dark ? "#1e1e1e" : "#ffffff";
  const text = dark ? "#f3f3f3" : "#17150F";
  const muted = dark ? "#a3a3a3" : "#6B675C";
  const border = dark ? "#333" : "#E8E4DA";

  const validityLabel = course.validity?.mode === "limited" ? `${course.validity.days}-day access` : "Lifetime access";

  return (
    <div style={{ background: pageBg, color: text }} className="min-h-full">
      {/* top strip */}
      <div style={{ background: accent }} className="h-1.5 w-full" />

      {/* Creator on the left, quiet platform credit on the right — the page
          should feel like the creator's, not ours. */}
      {mode === "live" && !compact && (
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-8">
          <CreatorChip name={creator?.name} avatar={creator?.avatar} light={dark} />
          <BuiltWithLink light={dark} />
        </div>
      )}

      <div className={`mx-auto ${compact ? "max-w-full px-4" : "max-w-5xl px-4 sm:px-8"} pb-16 pt-6`}>
        <div className={`grid gap-8 ${compact ? "" : "lg:grid-cols-[1fr_320px]"}`}>
          {/* Main column */}
          <div className="min-w-0">
            {/* Cover */}
            {(covers.length > 0 || embed) && (
              <div className="relative overflow-hidden rounded-2xl border" style={{ borderColor: border }}>
                {embed && slide === 0 ? (
                  <div className="aspect-video w-full"><iframe src={embed} className="h-full w-full" allowFullScreen title="Course video" /></div>
                ) : (
                  covers.length > 0 && <img src={covers[embed ? slide - 1 : slide]} alt="" className="aspect-video w-full object-cover" />
                )}
                {(covers.length + (embed ? 1 : 0)) > 1 && (
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {Array.from({ length: covers.length + (embed ? 1 : 0) }).map((_, i) => (
                      <button key={i} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`}
                        className="h-2 w-2 rounded-full" style={{ background: i === slide ? accent : "rgba(128,128,128,.4)" }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">{course.title}</h1>

            {/* About */}
            <div className="mt-5">
              <SectionLabel accent={accent}>About the course</SectionLabel>
              <div className="prose-sm mt-2 max-w-none text-[15px] leading-relaxed [&_ul]:list-disc [&_ul]:pl-5"
                style={{ color: text }} dangerouslySetInnerHTML={{ __html: course.description }} />
            </div>

            {/* Benefits */}
            {s.benefits?.enabled && s.benefits.items?.length > 0 && (
              <div className="mt-8">
                <SectionLabel accent={accent}>What you get</SectionLabel>
                <ul className="mt-3 space-y-2">
                  {s.benefits.items.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[15px]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white" style={{ background: accent }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Highlights */}
            {s.highlights?.enabled && s.highlights.items?.length > 0 && (
              <div className="mt-8">
                <SectionLabel accent={accent}>Course highlights</SectionLabel>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {s.highlights.items.map((h, i) => (
                    <div key={i} className="rounded-xl border p-3.5 text-sm" style={{ borderColor: border, background: cardBg }}>{h}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {s.instructions?.enabled && s.instructions.items?.length > 0 && (
              <div className="mt-8">
                <SectionLabel accent={accent}>Course instructions</SectionLabel>
                <ul className="mt-3 space-y-2">
                  {s.instructions.items.map((instr, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[15px]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold" style={{ background: accent }}>
                        {i + 1}
                      </span>
                      {instr}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Syllabus */}
            {course.modules?.length > 0 && (
              <div className="mt-8">
                <SectionLabel accent={accent}>Course content</SectionLabel>
                <div className="mt-3 space-y-3">
                  {course.modules.map((m) => (
                    <div key={m.id} className="overflow-hidden rounded-xl border" style={{ borderColor: border, background: cardBg }}>
                      <div className="px-4 py-3 text-sm font-bold">{m.title}</div>
                      {m.lessons.filter((l) => l.published).map((l) => (
                        <div key={l.id}
                          onClick={l.freePreview && mode === "live" && onPreviewLesson ? () => onPreviewLesson(l) : undefined}
                          className={`flex items-center gap-3 border-t px-4 py-3 text-sm ${l.freePreview && mode === "live" ? "cursor-pointer hover:opacity-80" : ""}`}
                          style={{ borderColor: border }}>
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px]" style={{ background: dark ? "#2a2a2a" : "#F4F1EA", color: muted }}>
                            {/* every row used to show a ▶ play icon, even quizzes and notes */}
                            {LESSON_GLYPH[l.type] || (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                            )}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{l.type === "quiz" ? l.quizTitle || l.title : l.title}</span>
                          {l.freePreview ? (
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white" style={{ background: accent }}>Free preview</span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase" style={{ borderColor: border, color: muted }}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
                              Locked
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {s.gallery?.enabled && s.gallery.images?.length > 0 && (
              <div className="mt-8">
                <SectionLabel accent={accent}>{s.gallery.title || "Gallery"}</SectionLabel>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {s.gallery.images.map((u, i) => (
                    <img key={i} src={u} alt="" className="aspect-square w-full rounded-xl border object-cover" style={{ borderColor: border }} />
                  ))}
                </div>
              </div>
            )}

            {/* About me */}
            {s.about?.enabled && s.about.text && (
              <div className="mt-8">
                <SectionLabel accent={accent}>{s.about.title || "About me"}</SectionLabel>
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{s.about.text}</p>
              </div>
            )}

            {/* Testimonials */}
            {s.testimonials?.enabled && s.testimonials.items?.length > 0 && (
              <div className="mt-8">
                <SectionLabel accent={accent}>What learners say</SectionLabel>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {s.testimonials.items.map((t) => (
                    <figure key={t.id} className="rounded-xl border p-4" style={{ borderColor: border, background: cardBg }}>
                      <blockquote className="text-sm leading-relaxed">"{t.text}"</blockquote>
                      <figcaption className="mt-2 text-xs font-bold" style={{ color: accent }}>— {t.name}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}

            {/* FAQ */}
            {s.faq?.enabled && s.faq.items?.length > 0 && (
              <div className="mt-8">
                <SectionLabel accent={accent}>Frequently asked questions</SectionLabel>
                <div className="mt-3 space-y-2">
                  {s.faq.items.map((f) => (
                    <div key={f.id} className="overflow-hidden rounded-xl border" style={{ borderColor: border, background: cardBg }}>
                      <button className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
                        onClick={() => setFaqOpen(faqOpen === f.id ? null : f.id)}>
                        {f.q}<span style={{ color: accent }}>{faqOpen === f.id ? "−" : "+"}</span>
                      </button>
                      {faqOpen === f.id && <p className="border-t px-4 py-3 text-sm" style={{ borderColor: border, color: muted }}>{f.a}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Policies */}
            {(st.terms || st.refundPolicy || st.privacyPolicy) && (
              <div className="mt-10 space-y-4 border-t pt-6 text-xs" style={{ borderColor: border, color: muted }}>
                {st.terms && <details><summary className="cursor-pointer font-semibold">Terms and conditions</summary><p className="mt-1 whitespace-pre-wrap">{st.terms}</p></details>}
                {st.refundPolicy && <details><summary className="cursor-pointer font-semibold">Refund policy</summary><p className="mt-1 whitespace-pre-wrap">{st.refundPolicy}</p></details>}
                {st.privacyPolicy && <details><summary className="cursor-pointer font-semibold">Privacy policy</summary><p className="mt-1 whitespace-pre-wrap">{st.privacyPolicy}</p></details>}
              </div>
            )}
          </div>

          {/* Buy card */}
          <div className={compact ? "" : "lg:sticky lg:top-6 lg:self-start"}>
            <div className="rounded-2xl border p-5 shadow-sm" style={{ borderColor: border, background: cardBg }}>
              <ul className="space-y-2.5 text-sm">
                <InfoRow icon="M15 10l4.55-2.28A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.9L15 14M4 6h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" text={`${lessonCount(course)} in-depth lessons`} muted={muted} />
                <InfoRow icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" text={validityLabel} muted={muted} />
                {st.certificate && <InfoRow icon="M12 15l-3.5 2 1-3.9L6 10.5l4-.3L12 6l2 4.2 4 .3-3.5 2.6 1 3.9z" text="Completion certificate" muted={muted} />}
                <li className="pt-1 font-display text-2xl font-bold">
                  {course.pricing?.mode === "free" ? "Free" : (
                    <>
                      {inr(price)}{" "}
                      {showStrike && <span className="text-base font-normal line-through" style={{ color: muted }}>{inr(original)}</span>}
                      {course.pricing?.mode === "pwyw" && <span className="text-sm font-normal" style={{ color: muted }}> or more — you decide</span>}
                    </>
                  )}
                </li>
              </ul>
              <button
                onClick={mode === "live" ? onBuy : undefined}
                className="mt-4 flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: accent, cursor: mode === "preview" ? "default" : "pointer" }}>
                {course.buttonText || "ENROLL NOW"} <span>→</span>
              </button>
              {mode === "live" && (
                <button onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
                  className="mt-3 w-full rounded-xl border px-4 py-2.5 text-xs font-semibold" style={{ borderColor: border, color: muted }}>
                  🔗 Copy link — invite your network
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-12 text-center text-[11px]" style={{ color: muted }}>Built with MegaProfile</p>
      </div>
    </div>
  );
}

function SectionLabel({ children, accent }) {
  return <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: accent }}>{children}</div>;
}

function InfoRow({ icon, text, muted }) {
  return (
    <li className="flex items-center gap-2.5">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: muted }}><path d={icon} /></svg>
      {text}
    </li>
  );
}