"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { inr } from "@/lib/courseModel";
import { TYPE_META, productPrice, productMrp } from "@/lib/products";
import { themeWithBrand, themeSurface } from "@/lib/storeTheme";
import { SHEEN } from "@/lib/texture";
import { SocialIcon, socialLabel } from "@/components/BrandIcons";
import { MadeWithBadge } from "@/components/Branding";
import VisitTracker, { trackClick } from "@/components/VisitTracker";

export default function StorePublic() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [hasSessions, setHasSessions] = useState(false);
  const [state, setState] = useState("loading");
  const [warned, setWarned] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("mp_profiles").select("*").eq("username", username).maybeSingle();
      if (!p || p.blocked) { setState("missing"); return; }
      setProfile(p);
      if (p.meta_title) document.title = p.meta_title;
      const [{ data: courses }, { data: products }, { data: sessions }] = await Promise.all([
        supabase.from("mp_courses").select("id,title,slug,cover_images,pricing").eq("owner_id", p.user_id).eq("status", "published"),
        supabase.from("mp_products").select("id,type,title,slug,data").eq("owner_id", p.user_id).eq("status", "published"),
        supabase.from("mp_sessions").select("id").eq("owner_id", p.user_id).eq("active", true)
      ]);
      const list = [
        ...(courses || []).map((c) => {
          const pr = c.pricing || {};
          const free = pr.mode === "free";
          const hasDisc = pr.discountEnabled && Number(pr.discountPrice) > 0 && Number(pr.discountPrice) < Number(pr.price);
          return {
            type: "course", title: c.title, slug: c.slug, img: c.cover_images?.[0],
            price: free ? 0 : (hasDisc ? Number(pr.discountPrice) : (Number(pr.price) || 0)),
            mrp: !free && hasDisc ? Number(pr.price) : 0
          };
        }),
        ...(products || []).map((x) => {
          const d = x.data || {};
          const price = productPrice(x.type, d);
          // course-style discount: original price struck-through when a discount is on
          const mrp = productMrp(x.type, d);
          return { type: x.type, title: x.title, slug: x.slug, img: d.coverImages?.[0], price, mrp };
        })
      ];
      setItems(list); setHasSessions((sessions || []).length > 0);
      setState("ready");
    })();
  }, [username]);

  if (state === "loading") return <div className="flex min-h-screen items-center justify-center text-inkmuted">Loading…</div>;
  if (state === "missing") return <div className="flex min-h-screen items-center justify-center text-inkmuted">This store doesn't exist.</div>;

  const t = themeWithBrand(profile.theme, profile.brand_color);
  const s = profile.socials || {};
  const socialList = Object.entries(s).filter(([, v]) => v);

  // The heading is the creator's NAME; @username is the quiet sub-line.
  const creatorName = profile.display_name || profile.full_name || profile.business_name || "";
  const heading = creatorName || `@${username}`;

  // Every outbound tap is logged so Clicks/CTR are measured, not guessed.
  const click = (targetType, targetId, label) =>
    trackClick({ ownerId: profile.user_id, path: `/${username}`, targetType, targetId, label });
  const links = profile.links || [];
  const font = profile.font || "Inter";
  const twoCol = profile.column_layout === "double";
  if (profile.sensitive_content && !warned) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6" style={themeSurface(t)}>
        <div className="max-w-sm rounded-2xl bg-white p-6 text-center">
          <h1 className="font-display text-xl font-bold">Sensitive content</h1>
          <p className="mt-2 text-sm text-inkmuted">This store may contain sensitive content. Do you want to continue?</p>
          <button onClick={() => setWarned(true)} className="btn-brand mt-4 w-full">Yes, continue</button>
        </div>
      </main>
    );
  }

  // A custom uploaded background overrides the theme surface.
  const bgStyle = profile.bg_image
    ? { backgroundImage: `url(${profile.bg_image})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }
    : themeSurface(t);

  return (
    <main className="relative min-h-screen" style={{ ...bgStyle, fontFamily: `'${font}', sans-serif` }}>
      {!profile.bg_image && <div className="pointer-events-none fixed inset-0 z-0" style={SHEEN} />}
      <VisitTracker ownerId={profile.user_id} path={`/${username}`} source="store" />

      {/* View the full marketing "Web App" version of this creator's page */}
      <a href={`/w/${username}`}
        className="fixed right-3 top-3 z-30 inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold text-white shadow-lg ring-1 ring-white/10 transition-transform hover:-translate-y-0.5 sm:right-5 sm:top-5 sm:text-sm"
        style={{ background: "#111827", fontFamily: "'Lexend', sans-serif" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" /></svg>
        View Web App
      </a>
      <div className="relative z-10 mx-auto max-w-xl px-4 pb-12 pt-16 text-center lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start lg:gap-10 lg:pb-14 lg:pt-24">
        {/* LEFT — profile card, sticky on desktop; stacked & centered on mobile */}
        <div className="text-center lg:sticky lg:top-24 lg:self-start lg:pt-2">
        <div className="mx-auto h-40 w-40 overflow-hidden rounded-full border-2 shadow-lg sm:h-48 sm:w-48" style={{ borderColor: t.sub }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            : <div className="flex h-full w-full items-center justify-center text-5xl font-bold" style={{ background: "rgba(255,255,255,0.15)", color: t.text }}>{(creatorName || username)[0]?.toUpperCase()}</div>}
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl" style={{ color: t.text }}>{heading}</h1>
        {creatorName && (
          <div className="mt-0.5 text-sm opacity-70" style={{ color: t.sub }}>@{username}</div>
        )}
        {profile.bio && <p className="mt-3 text-sm" style={{ color: t.sub }}>{profile.bio}</p>}

        {socialList.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {socialList.map(([k, v]) => (
              <a key={k} href={v} target="_blank" rel="noreferrer" aria-label={socialLabel(k)}
                onClick={() => click("social", k, socialLabel(k))}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 hover:bg-white/15"
                style={{ color: t.text }}>
                {/* icon only — no text label */}
                <SocialIcon name={k} size={24} className="shrink-0 rounded-md" />
              </a>
            ))}
          </div>
        )}

        {hasSessions && (
          <Link href={`/book/${username}`} onClick={() => click("booking", "book", "Book a session")}
            className="mt-6 inline-block rounded-full bg-black px-8 py-3 text-center text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-90">
            Book a session with me
          </Link>
        )}

        </div>

        {/* RIGHT — products & links. Big one-per-row cards; the page scrolls
            normally beside the sticky profile so each card's cover, title AND
            price are always visible together (no clipping, no giant covers). */}
        <div className={`mt-8 grid gap-6 text-left lg:mt-0 ${twoCol ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          {links.filter((l) => l.url).map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noreferrer"
              onClick={() => click("link", l.url, l.label || "Link")}
              className="rounded-lg border p-4 text-center font-semibold hover:opacity-90" style={{ borderColor: t.btnBorder, color: t.text, background: "rgba(255,255,255,0.12)" }}>
              {l.label || "Link"}
            </a>
          ))}
          {items.map((it) => {
            const off = it.mrp > 0 ? Math.round(((it.mrp - it.price) / it.mrp) * 100) : 0;
            return (
              <Link key={`${it.type}-${it.slug}`} href={`${TYPE_META[it.type].publicPath}/${it.slug}`}
                onClick={() => click("product", it.slug, it.title)}
                className="group col-span-full block overflow-hidden rounded-xl bg-white shadow-xl transition-transform hover:-translate-y-0.5">
                {/* wide cover banner, like the reference course card */}
                <div className="aspect-[16/9] w-full overflow-hidden bg-paper">
                  {it.img
                    ? <img src={it.img} alt="" className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center text-4xl text-inkmuted/40">{TYPE_META[it.type].icon || "🎓"}</div>}
                </div>
                <div className="p-5 sm:p-6">
                  <div className="line-clamp-2 font-display text-lg font-bold leading-snug text-ink sm:text-xl">{it.title}</div>
                  {/* price left, % off pushed to the right — like the reference card */}
                  <div className="mt-6 flex items-center justify-between gap-3">
                    {it.price === 0 ? (
                      <span className="text-2xl font-extrabold text-ink">Free</span>
                    ) : (
                      <>
                        <span className="flex items-baseline gap-2">
                          <span className="text-2xl font-extrabold text-ink">{inr(it.price)}</span>
                          {it.mrp > 0 && <span className="text-lg font-medium text-inkmuted line-through">{inr(it.mrp)}</span>}
                        </span>
                        {off > 0 && <span className="shrink-0 text-base font-semibold text-inkmuted">{off}% off</span>}
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
          {items.length === 0 && !hasSessions && links.length === 0 && <p className="col-span-full text-center text-sm" style={{ color: t.sub }}>Nothing published yet — check back soon.</p>}
        </div>
      </div>

      <MadeWithBadge />
    </main>
  );
}