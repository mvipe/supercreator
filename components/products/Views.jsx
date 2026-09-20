"use client";
import { useState } from "react";
import { ytEmbed, inr } from "@/lib/courseModel";
import { productPrice, productMrp } from "@/lib/products";
import { BuiltWithLink, CreatorChip } from "@/components/Branding";
import CopyLinkButton from "@/components/CopyLinkButton";

// =============================================================
// Public product pages (event / locked content / payment page / book).
//
// These used to be plain single-column pages while courses got the full
// treatment — creator chip, cover carousel, sticky buy card, highlights,
// FAQs. Books and payment pages now share that same layout via ProductShell
// so every product a creator sells looks like it came from the same shop.
// =============================================================

/** Discount % from an optional struck-through original price. 0 = no discount. */
const pctOff = (price, mrp) => (Number(mrp) > Number(price) ? Math.round(((mrp - price) / mrp) * 100) : 0);

/** Inline "₹price ₹mrp NN% off". `free`/pwyw callers pass the right price. */
function PriceBits({ price, mrp, strikeClass = "text-base", offClass = "text-sm" }) {
  const off = pctOff(price, mrp);
  return (
    <>
      {inr(price)}
      {off > 0 && <span className={`${strikeClass} ml-1.5 font-normal text-inkmuted line-through`}>{inr(mrp)}</span>}
      {off > 0 && <span className={`${offClass} ml-1.5 font-bold text-teal`}>{off}% off</span>}
    </>
  );
}

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

/**
 * Course-style page frame: accent strip, clickable creator chip, two columns
 * with a sticky buy card on desktop and an inline one on mobile.
 *
 * @param buyCard  JSX for the purchase panel (rendered twice — mobile + desktop)
 */
function ProductShell({ accent = "#2E6EF7", creator, mode = "live", cover, title, subtitle, buyCard, mobileBuyCard, children }) {
  return (
    <div className="min-h-full bg-white text-ink">
      <div style={{ background: accent }} className="h-1.5 w-full" />

      {mode === "live" && (
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-8">
          <CreatorChip name={creator?.name} avatar={creator?.avatar} username={creator?.username} light={false} />
          <BuiltWithLink light={false} />
        </div>
      )}

      <div className={`mx-auto max-w-5xl px-4 pt-6 sm:px-8 ${mode === "live" ? "pb-28 lg:pb-16" : "pb-16"}`}>
        <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
          <div className="min-w-0">
            {cover}
            <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] text-inkmuted">{subtitle}</p>}

            {/* Mobile: buy card sits right under the title, like the course page. */}
            <div className="mt-6 lg:hidden">{mobileBuyCard || buyCard}</div>

            {children}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-6">{buyCard}</div>
          </aside>
        </div>
      </div>

      <p className="pb-6 text-center text-[11px] text-inkmuted">Built with SuperCreators</p>
    </div>
  );
}

function Label({ accent, children }) {
  return <div className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: accent }}>{children}</div>;
}

/** Cover carousel — video first (if any), then every uploaded image. */
function Cover({ images = [], video }) {
  const [slide, setSlide] = useState(0);
  const embed = ytEmbed(video);
  const count = (images?.length || 0) + (embed ? 1 : 0);
  if (!count) return null;

  const showVideo = embed && slide === 0;
  const imgIndex = embed ? slide - 1 : slide;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line">
      {showVideo ? (
        <div className="aspect-video w-full"><iframe src={embed} className="h-full w-full" allowFullScreen title="video" /></div>
      ) : (
        images[imgIndex] && (
          <div className="flex w-full items-center justify-center bg-paper">
            <img src={images[imgIndex]} alt="" className="max-h-[70vh] w-full object-contain sm:max-h-[520px]" />
          </div>
        )
      )}
      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {Array.from({ length: count }).map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`}
              className="h-2 w-2 rounded-full" style={{ background: i === slide ? "#fff" : "rgba(255,255,255,.5)", boxShadow: "0 0 0 1px rgba(0,0,0,.2)" }} />
          ))}
        </div>
      )}
    </div>
  );
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

/** Checklist of "what's included" points. */
function Highlights({ items = [], accent, title = "What's included" }) {
  if (!items.filter(Boolean).length) return null;
  return (
    <div className="mt-8">
      <Label accent={accent}>{title}</Label>
      <ul className="mt-3 space-y-2.5">
        {items.filter(Boolean).map((h, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[15px] leading-relaxed">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white" style={{ background: accent }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </span>
            <span>{h}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** FAQ accordion, matching the course page. */
function Faqs({ items = [], accent }) {
  const [open, setOpen] = useState(null);
  const list = (items || []).filter((f) => f?.q);
  if (!list.length) return null;
  return (
    <div className="mt-8">
      <Label accent={accent}>FAQs</Label>
      <div className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {list.map((f, i) => (
          <div key={i}>
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold hover:bg-paper/60">
              <span className="min-w-0 flex-1">{f.q}</span>
              <span className="shrink-0 text-inkmuted transition-transform" style={{ transform: open === i ? "rotate(180deg)" : "none" }}>⌄</span>
            </button>
            {open === i && <p className="whitespace-pre-wrap px-4 pb-4 text-sm leading-relaxed text-inkmuted">{f.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The bordered purchase panel that ProductShell pins on desktop. */
function BuyCard({ accent, mode, onBuy, label, priceNode, meta = [], note, owned, ownedNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      {meta.length > 0 && (
        <div className="mb-4 space-y-2">
          {meta.map(([icon, text], i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm text-inkmuted">
              <span className="shrink-0 text-base">{icon}</span><span className="min-w-0 truncate">{text}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-baseline gap-1.5 font-display text-3xl font-bold">{priceNode}</div>

      {owned ? (
        <div className="mt-4">{ownedNode}</div>
      ) : (
        <button onClick={mode === "live" ? onBuy : undefined}
          className="mt-4 flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: accent, cursor: mode === "preview" ? "default" : "pointer" }}>
          <span>{label}</span><span>→</span>
        </button>
      )}

      {note && <p className="mt-2 text-center text-[11px] text-inkmuted">{note}</p>}

      {mode === "live" && (
        <div className="mt-3">
          <CopyLinkButton
            accent={accent}
            className="rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-inkmuted"
          />
        </div>
      )}
    </div>
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
        <InfoCard label="Price" value={d.priceMode === "free" ? "Free" : <span className="flex flex-wrap items-baseline gap-1.5"><PriceBits price={productPrice("event", d)} mrp={productMrp("event", d)} strikeClass="text-xs" offClass="text-xs" /></span>} />
      </div>
      <div className="mt-6">
        <Label accent={accent}>About the event</Label>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{d.description}</p>
      </div>
      <Cta accent={accent} label={d.buttonText || "Register now"} onClick={onBuy} mode={mode} />
      {mode === "live" && (
        <div className="mt-4">
          <CopyLinkButton accent={accent} className="rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-inkmuted" />
        </div>
      )}
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
            <div className="mt-2 flex flex-wrap items-baseline justify-center gap-2 font-display text-2xl font-bold"><PriceBits price={productPrice("locked", d)} mrp={productMrp("locked", d)} /></div>
          </div>
          <Cta accent={accent} label={d.buttonText || "Unlock now"} onClick={onBuy} mode={mode} />
          {mode === "live" && (
            <div className="mt-4">
              <CopyLinkButton accent={accent} className="rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-inkmuted" />
            </div>
          )}
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
/**
 * Built on ProductShell so a payment page has the same anatomy as a course
 * page: cover media, clickable creator chip, description, highlights, FAQs
 * and a sticky buy card with a working "copy link" button.
 */
export function PaymentView({ product, mode = "live", onBuy, creator = null, inlineCheckout = null }) {
  const d = product.data || {};
  const accent = d.accent || "#2E6EF7";
  const isPwyw = d.priceMode === "pwyw";
  const price = isPwyw ? Number(d.minPrice) || 0 : productPrice("payment", d);
  const mrp = productMrp("payment", d);

  const buyCard = (
    <BuyCard
      accent={accent} mode={mode} onBuy={onBuy}
      label={d.buttonText || "Pay now"}
      priceNode={isPwyw
        ? <><span>{inr(price)}</span><span className="text-sm font-semibold text-inkmuted">or more</span></>
        : <PriceBits price={price} mrp={mrp} />}
      meta={[
        [isPwyw ? "🤝" : "💳", isPwyw ? "Pay what you want" : "One-time payment"],
        ["🔒", "Secure payment via Razorpay"]
      ]}
      note="No account needed — a receipt is emailed to you."
    />
  );

  return (
    <ProductShell
      accent={accent} creator={creator} mode={mode}
      title={product.title} subtitle={d.subtitle}
      cover={<Cover images={d.coverImages} video={d.coverVideo} />}
      buyCard={buyCard}
      mobileBuyCard={inlineCheckout}
    >
      <div className="mt-8">
        <Label accent={accent}>About the page</Label>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{d.description}</p>
      </div>
      <Highlights items={d.highlights} accent={accent} />
      <Faqs items={d.faqs} accent={accent} />
    </ProductShell>
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

/* ---------------- BOOK / E-BOOK ---------------- */
/** Same frame as a course page — the ebook just swaps the cover for the book art. */
export function BookView({ product, mode = "live", onBuy, owned = false, creator = null, inlineCheckout = null }) {
  const d = product.data || {};
  const accent = d.accent || "#2E6EF7";
  const isPwyw = d.priceMode === "pwyw";
  const isFree = d.priceMode === "free";
  const price = isPwyw ? Number(d.minPrice) || 0 : productPrice("book", d);
  const mrp = productMrp("book", d);
  const embed = ytEmbed(d.coverVideo);

  const cover = (
    <div className="space-y-4">
      {embed && (
        <div className="aspect-video overflow-hidden rounded-2xl border border-line">
          <iframe src={embed} className="h-full w-full" allowFullScreen title="Book video" />
        </div>
      )}
      <div className="flex items-center justify-center overflow-hidden rounded-2xl border border-line bg-paper py-6">
        {d.coverImages?.[0]
          ? <img src={d.coverImages[0]} alt="" className="max-h-[420px] w-auto max-w-[70%] rounded-lg shadow-xl" />
          : <div className="flex aspect-[3/4] w-[220px] items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-white shadow-xl"><span className="text-5xl">📕</span></div>}
      </div>
    </div>
  );

  const ownedNode = d.fileUrl ? (
    <a href={d.fileUrl} target="_blank" download={d.fileName || true}
      className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm font-bold text-white hover:opacity-90" style={{ background: accent }}>
      Download your book <span>↓</span>
    </a>
  ) : (
    <div className="rounded-xl border border-line bg-paper px-4 py-3.5 text-sm font-semibold text-inkmuted">
      ✓ You own this book — the download appears here once the creator uploads the file.
    </div>
  );

  const buyCard = (
    <BuyCard
      accent={accent} mode={mode} onBuy={onBuy} owned={owned} ownedNode={ownedNode}
      label={d.buttonText || "Buy & download"}
      priceNode={isFree
        ? <span>Free</span>
        : isPwyw
          ? <><span>{inr(price)}</span><span className="text-sm font-semibold text-inkmuted">or more</span></>
          : <PriceBits price={price} mrp={mrp} />}
      meta={[
        ...(d.pages > 0 ? [["📄", `${d.pages} pages`]] : []),
        ...(d.format ? [["📦", `${d.format} download`]] : []),
        ["♾️", "Lifetime access"]
      ]}
      note="Instant download after payment · Secure via Razorpay"
    />
  );

  return (
    <ProductShell
      accent={accent} creator={creator} mode={mode}
      title={product.title}
      subtitle={d.subtitle || (d.author ? `by ${d.author}` : "")}
      cover={cover}
      buyCard={buyCard}
      mobileBuyCard={inlineCheckout}
    >
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {d.pages > 0 && <span className="pill bg-paper text-inkmuted">{d.pages} pages</span>}
        {d.format && <span className="pill bg-paper text-inkmuted">{d.format}</span>}
        {mrp > 0 && <span className="pill" style={{ background: "#DCFCE7", color: "#0E9F6E" }}>{pctOff(price, mrp)}% off</span>}
      </div>

      <div className="mt-8">
        <Label accent={accent}>About this book</Label>
        <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{d.description}</p>
      </div>
      <Highlights items={d.highlights} accent={accent} title="What's inside" />
      <Faqs items={d.faqs} accent={accent} />
    </ProductShell>
  );
}
