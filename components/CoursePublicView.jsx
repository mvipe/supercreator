"use client";
import { useEffect, useState } from "react";
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

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export default function CoursePublicView({ course, mode = "live", onBuy, onPreviewLesson, compact = false, creator = null, user = null, addon = null, busy = false, error = "", owned = false }) {
  const [slide, setSlide] = useState(0);
  const [faqOpen, setFaqOpen] = useState(null);
  // Inline checkout form (SuperProfile-style: buy without an account). Shared by
  // the mobile and desktop buy cards so both stay in sync.
  const [form, setForm] = useState({
    email: user?.email || "",
    phone: user?.user_metadata?.phone || "",
    state: "",
    gstin: "",
    addon: false,
    pwyw: Math.max(course.pricing?.minPrice || 99, 99)
  });
  const setF = (patch) => setForm((f) => ({ ...f, ...patch }));
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

  // Mobile sticky CTA: show a pinned "Get it now" bar until the buy form is
  // actually on screen (then hide it so it doesn't cover the form's own button).
  const [formInView, setFormInView] = useState(false);
  useEffect(() => {
    if (mode !== "live" || compact) return;
    const el = document.getElementById("course-buy");
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setFormInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [mode, compact]);

  function jumpToForm() {
    if (owned) { onBuy?.(null); return; }
    const el = document.getElementById("course-buy");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => el?.querySelector("input[type=email]")?.focus(), 450);
  }

  const isFree = course.pricing?.mode === "free";
  const isPwyw = course.pricing?.mode === "pwyw";
  const inputStyle = { borderColor: border, background: dark ? "#141414" : "#fff", color: text };
  const inputCls = "w-full rounded-[10px] border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5";

  /** The buy card + inline checkout. Rendered once for mobile and once for desktop. */
  function BuyCard() {
    const base = isPwyw ? Number(form.pwyw) || 0 : price;
    const addonPrice = addon && form.addon ? Number(addon.price) || 0 : 0;
    const total = base + addonPrice;
    const preview = mode === "preview";

    function submit(e) {
      e.preventDefault();
      if (preview) return;
      onBuy?.(form);
    }

    return (
      <div className="rounded-2xl border p-5 shadow-sm" style={{ borderColor: border, background: cardBg }}>
        <ul className="space-y-2.5 text-sm">
          <InfoRow icon="M15 10l4.55-2.28A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.9L15 14M4 6h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" text={`${lessonCount(course)} in-depth lessons`} muted={muted} />
          <InfoRow icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" text={validityLabel} muted={muted} />
          {st.certificate && <InfoRow icon="M12 15l-3.5 2 1-3.9L6 10.5l4-.3L12 6l2 4.2 4 .3-3.5 2.6 1 3.9z" text="Completion certificate" muted={muted} />}
          <li className="pt-1 font-display text-2xl font-bold">
            {isFree ? "Free" : (
              <>
                {inr(price)}{" "}
                {showStrike && <span className="text-base font-normal line-through" style={{ color: muted }}>{inr(original)}</span>}
                {isPwyw && <span className="text-sm font-normal" style={{ color: muted }}> or more — you decide</span>}
              </>
            )}
          </li>
        </ul>

        {owned ? (
          <button onClick={() => mode === "live" && onBuy?.(null)}
            className="mt-4 flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: accent }}>
            Continue learning <span>→</span>
          </button>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            {!user && <p className="text-xs" style={{ color: muted }}>Access to this purchase will be sent to this email</p>}
            <input className={inputCls} style={inputStyle} type="email" required placeholder="Email address"
              value={form.email} onChange={(e) => setF({ email: e.target.value })} />
            <div className="flex items-stretch overflow-hidden rounded-[10px] border" style={{ borderColor: border }}>
              <span className="flex items-center px-3 text-sm" style={{ background: dark ? "#2a2a2a" : "#F4F1EA", color: muted }}>+91</span>
              <input className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none" style={{ color: text }} type="tel" required
                placeholder="Phone number" value={form.phone} onChange={(e) => setF({ phone: e.target.value })} />
            </div>
            <input className={inputCls} style={inputStyle} type="text" placeholder="GSTIN (optional)"
              value={form.gstin} onChange={(e) => setF({ gstin: e.target.value })} />
            <div className="relative">
              <select
                className={`${inputCls} cursor-pointer appearance-none pr-10`}
                style={inputStyle} required value={form.state}
                onChange={(e) => setF({ state: e.target.value })}>
                <option value="" style={{ color: "#6B675C" }}>Select State</option>
                {INDIAN_STATES.map((s2) => <option key={s2} value={s2} style={{ color: "#17150F" }}>{s2}</option>)}
              </select>
              {/* custom down-chevron so the native arrow doesn't clash with the theme */}
              <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: muted }}>
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {isPwyw && (
              <input className={inputCls} style={inputStyle} type="number" min={course.pricing?.minPrice || 99}
                value={form.pwyw} onChange={(e) => setF({ pwyw: e.target.value })} placeholder="Amount" />
            )}

            {addon && (
              <label className="flex cursor-pointer gap-3 rounded-xl border p-3"
                style={{ borderColor: form.addon ? accent : border, background: form.addon ? `${accent}12` : "transparent" }}>
                <input type="checkbox" className="mt-1 shrink-0" checked={form.addon} onChange={(e) => setF({ addon: e.target.checked })} />
                {addon.img && <img src={addon.img} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />}
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-snug">{addon.title}</span>
                  {addon.subtitle && <span className="mt-0.5 block text-xs" style={{ color: muted }}>{addon.subtitle}</span>}
                  <span className="mt-1 block text-sm font-bold">
                    {inr(Number(addon.price) || 0)}{" "}
                    {Number(addon.mrp) > Number(addon.price) && <span className="text-xs font-normal line-through" style={{ color: muted }}>{inr(addon.mrp)}</span>}
                  </span>
                </span>
              </label>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button type="submit" disabled={busy || preview}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: accent, cursor: preview ? "default" : "pointer" }}>
              {busy ? "Processing…" : (
                <>
                  <span>{course.buttonText || (isFree ? "Get for free" : "ENROLL NOW")}</span>
                  <span>{isFree ? "→" : `${inr(total)} →`}</span>
                </>
              )}
            </button>
            <p className="text-center text-[11px]" style={{ color: muted }}>Secure payment via Razorpay · no account needed</p>
          </form>
        )}

        {mode === "live" && (
          <button type="button" onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
            className="mt-3 w-full rounded-xl border px-4 py-2.5 text-xs font-semibold" style={{ borderColor: border, color: muted }}>
            🔗 Copy link — invite your network
          </button>
        )}
      </div>
    );
  }

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

      <div className={`mx-auto ${compact ? "max-w-full px-4" : "max-w-5xl px-4 sm:px-8"} pt-6 ${mode === "live" && !compact ? "pb-28 lg:pb-16" : "pb-16"}`}>
        <div className={`grid gap-8 ${compact ? "" : "lg:grid-cols-[1fr_320px]"}`}>
          {/* Main column */}
          <div className="min-w-0">
            {/* Cover — images show in full (any aspect ratio), letterboxed on a
                neutral backdrop rather than cropped to 16:9. Video keeps 16:9. */}
            {(covers.length > 0 || embed) && (
              <div className="relative overflow-hidden rounded-2xl border" style={{ borderColor: border }}>
                {embed && slide === 0 ? (
                  <div className="aspect-video w-full"><iframe src={embed} className="h-full w-full" allowFullScreen title="Course video" /></div>
                ) : (
                  covers.length > 0 && (
                    <div className="flex w-full items-center justify-center" style={{ background: dark ? "#0f0f0f" : "#F4F1EA" }}>
                      <img src={covers[embed ? slide - 1 : slide]} alt="" className="max-h-[70vh] w-full object-contain sm:max-h-[520px]" />
                    </div>
                  )
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

            {/* Mobile: the buy card sits directly under the cover/title, not at
                the very bottom of the page. Desktop keeps it in the sticky column. */}
            <div id="course-buy" className="mt-6 scroll-mt-4 lg:hidden">
              {BuyCard()}
            </div>

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

          {/* Buy card — desktop sticky column (mobile copy renders under the title). */}
          <div className={`hidden lg:block ${compact ? "" : "lg:sticky lg:top-6 lg:self-start"}`}>
            {BuyCard()}
          </div>
        </div>

        <p className="mt-12 text-center text-[11px]" style={{ color: muted }}>Built with MegaProfile</p>
      </div>

      {/* Mobile sticky CTA — always in reach; tapping scrolls to the inline form.
          Hidden once the form itself is on screen, and on desktop. */}
      {mode === "live" && !compact && !formInView && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 shadow-[0_-6px_16px_rgba(0,0,0,0.08)] lg:hidden"
          style={{ background: cardBg, borderColor: border }}>
          <button onClick={jumpToForm}
            className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm font-bold text-white"
            style={{ background: accent }}>
            <span>{owned ? "Continue learning" : (course.buttonText || (isFree ? "Get for free" : "Get it now"))}</span>
            <span>{owned || isFree ? "→" : `${inr(price)} →`}</span>
          </button>
        </div>
      )}
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