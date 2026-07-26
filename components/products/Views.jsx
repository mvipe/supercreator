"use client";
import { ytEmbed, inr } from "@/lib/courseModel";

function Shell({ accent = "#2E6EF7", children }) {
  return (
    <div className="min-h-full bg-white text-ink">
      <div style={{ background: accent }} className="h-1.5 w-full" />
      {/* extra bottom room on mobile so the sticky CTA bar never covers content */}
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-8 sm:pb-16">{children}</div>
      <p className="pb-24 text-center text-[11px] text-inkmuted sm:pb-6">Built with SuperCreators</p>
    </div>
  );
}
function Label({ accent, children }) {
  return <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: accent }}>{children}</div>;
}
function Cover({ images = [], video }) {
  const embed = ytEmbed(video);
  if (embed) return <div className="aspect-video overflow-hidden rounded-2xl border border-line"><iframe src={embed} className="h-full w-full" allowFullScreen title="video" /></div>;
  // Images show in full (any aspect ratio), letterboxed rather than cropped.
  if (images[0]) return (
    <div className="flex w-full items-center justify-center overflow-hidden rounded-2xl border border-line bg-paper">
      <img src={images[0]} alt="" className="max-h-[70vh] w-full object-contain sm:max-h-[520px]" />
    </div>
  );
  return null;
}
function Cta({ accent, label, onClick, mode }) {
  const btn = (
    <button onClick={mode === "live" ? onClick : undefined}
      className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm font-bold text-white hover:opacity-90"
      style={{ background: accent, cursor: mode === "preview" ? "default" : "pointer" }}>
      {label} <span>→</span>
    </button>
  );
  return (
    <>
      {/* tablet/desktop: inline in the content flow */}
      <div className="mt-6 hidden sm:block">{btn}</div>
      {/* mobile: pinned to the bottom so it's always in reach; tapping opens the
          checkout form. Only in the live page, never the editor preview. */}
      {mode === "live"
        ? <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 py-3 shadow-[0_-6px_16px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">{btn}</div>
        : <div className="mt-6 sm:hidden">{btn}</div>}
    </>
  );
}

/* ---------------- EVENT ---------------- */
export function EventView({ product, mode = "live", onBuy }) {
  const d = product.data || {};
  const accent = d.accent || "#2E6EF7";
  const dt = d.startsAt ? new Date(d.startsAt) : null;
  return (
    <Shell accent={accent}>
      <Cover images={d.coverImages} video={d.coverVideo} />
      <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">{product.title}</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <InfoCard label="When" value={dt ? dt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "TBA"} />
        <InfoCard label="Where" value={d.mode === "offline" ? (d.venue || "Venue TBA") : "Online"} />
        <InfoCard label="Price" value={d.priceMode === "free" ? "Free" : inr(d.price)} />
      </div>
      <div className="mt-6">
        <Label accent={accent}>About the event</Label>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{d.description}</p>
      </div>
      <Cta accent={accent} label={d.buttonText || "Register now"} onClick={onBuy} mode={mode} />
    </Shell>
  );
}

/* ---------------- LOCKED CONTENT ---------------- */
export function LockedView({ product, mode = "live", onBuy, unlocked = false }) {
  const d = product.data || {};
  const accent = d.accent || "#2E6EF7";
  const embed = ytEmbed(d.videoUrl);
  return (
    <Shell accent={accent}>
      <div className="flex items-center gap-2">
        <span className="pill" style={{ background: "#EAF1FE", color: accent }}>{d.category || "Content"}</span>
      </div>
      <h1 className="mt-3 font-display text-3xl font-bold">{product.title}</h1>
      {!unlocked ? (
        <>
          <div className="mt-6 rounded-2xl border border-line bg-paper p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: accent }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
            </div>
            <p className="mt-3 text-sm text-inkmuted">{d.teaser || "Unlock this content to view it."}</p>
            <div className="mt-2 font-display text-2xl font-bold">{inr(d.price)}</div>
          </div>
          <Cta accent={accent} label={d.buttonText || "Unlock now"} onClick={onBuy} mode={mode} />
        </>
      ) : (
        <div className="mt-6 space-y-5">
          {d.message && <p className="whitespace-pre-wrap rounded-2xl border border-line bg-paper p-5 text-[15px] leading-relaxed">{d.message}</p>}
          {embed && <div className="aspect-video overflow-hidden rounded-2xl border border-line"><iframe src={embed} className="h-full w-full" allowFullScreen title="video" /></div>}
          {!embed && d.videoUrl && <video src={d.videoUrl} controls className="aspect-video w-full rounded-2xl border border-line bg-black" />}
          {d.images?.map((u, i) => <img key={i} src={u} alt="" className="w-full rounded-2xl border border-line" />)}
          {d.files?.length > 0 && (
            <div className="space-y-2">
              {d.files.map((f, i) => (
                <a key={i} href={f.url} target="_blank" className="flex items-center gap-3 rounded-xl border border-line p-3.5 text-sm font-semibold hover:bg-paper">
                  📄 {f.name || `File ${i + 1}`} <span className="ml-auto" style={{ color: accent }}>Download ↓</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

/* ---------------- PAYMENT PAGE ---------------- */
export function PaymentView({ product, mode = "live", onBuy }) {
  const d = product.data || {};
  const accent = d.accent || "#2E6EF7";
  return (
    <Shell accent={accent}>
      <h1 className="mt-2 font-display text-3xl font-bold">{product.title}</h1>
      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-inkmuted">{d.description}</p>
      <div className="mt-6 rounded-2xl border border-line bg-paper p-6 text-center">
        <div className="text-xs font-semibold uppercase tracking-wide text-inkmuted">{d.priceMode === "pwyw" ? "Pay what you want (min)" : "Amount"}</div>
        <div className="mt-1 font-display text-3xl font-bold">{inr(d.priceMode === "pwyw" ? d.minPrice : d.price)}</div>
      </div>
      <Cta accent={accent} label={d.buttonText || "Pay now"} onClick={onBuy} mode={mode} />
    </Shell>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-3.5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-inkmuted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

/* ---------------- BOOK ---------------- */
export function BookView({ product, mode = "live", onBuy, owned = false }) {
  const d = product.data || {};
  const accent = d.accent || "#2E6EF7";
  return (
    <Shell accent={accent}>
      <div className="grid items-start gap-6 sm:grid-cols-[260px_1fr]">
        <div className="mx-auto w-full max-w-[260px] self-start overflow-hidden rounded-xl border border-line shadow-lg sm:mx-0">
          {d.coverImages?.[0]
            ? <img src={d.coverImages[0]} alt="" className="block h-auto w-full" />
            : <div className="flex aspect-[3/4] items-center justify-center bg-gradient-to-br from-brand to-brand-dark text-white"><span className="text-4xl">📕</span></div>}
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">{product.title}</h1>
          {d.author && <p className="mt-1 text-sm text-inkmuted">by {d.author}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {d.pages > 0 && <span className="pill bg-paper text-inkmuted">{d.pages} pages</span>}
            {d.format && <span className="pill bg-paper text-inkmuted">{d.format}</span>}
            <span className="pill" style={{ background: "#EAF1FE", color: accent }}>{d.priceMode === "free" ? "Free" : inr(d.priceMode === "pwyw" ? d.minPrice : d.price)}</span>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{d.description}</p>
          {owned ? (
            d.fileUrl ? (
              <a href={d.fileUrl} target="_blank" download={d.fileName || true}
                className="mt-6 flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm font-bold text-white hover:opacity-90" style={{ background: accent }}>
                Download your book <span>↓</span>
              </a>
            ) : (
              <div className="mt-6 rounded-xl border border-line bg-paper px-4 py-3.5 text-sm font-semibold text-inkmuted">
                ✓ You own this book — the download will appear here once the creator uploads the file.
              </div>
            )
          ) : (
            <Cta accent={accent} label={d.buttonText || "Buy & download"} onClick={onBuy} mode={mode} />
          )}
        </div>
      </div>
    </Shell>
  );
}