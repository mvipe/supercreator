"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { inr } from "@/lib/courseModel";
import { TYPE_META, productPrice } from "@/lib/products";
import { themeWithBrand, themeSurface } from "@/lib/storeTheme";
import { SHEEN } from "@/lib/texture";
import { SocialIcon, socialLabel } from "@/components/BrandIcons";
import { MadeWithBadge } from "@/components/Branding";
import { BRAND } from "@/lib/brand";
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
          // book/course-style discount: original price kept as `mrp` when higher
          const mrp = Number(d.price) > price ? Number(d.price) : 0;
          return { type: x.type, title: x.title, slug: x.slug, img: d.coverImages?.[0], price, mrp: d.priceMode === "pwyw" ? 0 : mrp };
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
  // Only fall back to @username as the heading when there's no name at all —
  // otherwise it'd read "@ayush1081" twice, once big and once small.
  const creatorName = profile.display_name || profile.full_name || profile.business_name || "";
  const heading = creatorName || `@${username}`;

  // Every outbound tap is logged so Clicks/CTR are measured, not guessed.
  const click = (targetType, targetId, label) =>
    trackClick({ ownerId: profile.user_id, path: `/u/${username}`, targetType, targetId, label });
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

  return (
    <main className="relative min-h-screen overflow-x-hidden" style={{ ...themeSurface(t), fontFamily: `'${font}', sans-serif` }}>
      <div className="pointer-events-none fixed inset-0 z-0" style={SHEEN} />
      <VisitTracker ownerId={profile.user_id} path={`/u/${username}`} source="store" />
      <div className="relative z-10 mx-auto max-w-xl px-4 py-12 text-center">
        <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border-2 shadow-lg" style={{ borderColor: t.sub }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            : <div className="flex h-full w-full items-center justify-center text-3xl font-bold" style={{ background: "rgba(255,255,255,0.15)", color: t.text }}>{(creatorName || username)[0]?.toUpperCase()}</div>}
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold" style={{ color: t.text }}>{heading}</h1>
        {creatorName && (
          <div className="mt-0.5 text-sm opacity-70" style={{ color: t.sub }}>@{username}</div>
        )}
        <div className="mt-2 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/90">{BRAND.name}</div>
        {profile.bio && <p className="mt-3 text-sm" style={{ color: t.sub }}>{profile.bio}</p>}

        {/* Was `flex justify-center` with no wrap and no scroll: 4+ socials
            pushed the row wider than the viewport, which made the WHOLE page
            scroll sideways on mobile and left dead space on the right.
            Now it's a self-contained scrolling strip. */}
        {socialList.length > 0 && (
          <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
            {socialList.map(([k, v]) => (
              <a key={k} href={v} target="_blank" rel="noreferrer" aria-label={socialLabel(k)}
                onClick={() => click("social", k, socialLabel(k))}
                className="inline-flex shrink-0 snap-start items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
                style={{ color: t.text }}>
                {/* real brand marks — this used to render the letters "IG"/"YT"/"X" */}
                <SocialIcon name={k} size={22} className="shrink-0 rounded-md" />
                {socialLabel(k)}
              </a>
            ))}
          </div>
        )}

        <div className={`mt-8 grid gap-3 text-left ${twoCol ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          {hasSessions && (
            <Link href={`/book/${username}`} onClick={() => click("booking", "book", "Book a session")}
              className="rounded-lg p-4 text-center font-display text-base font-bold shadow-lg hover:opacity-95" style={{ background: t.btn, color: t.btnText }}>
              📅 Book a session with me
            </Link>
          )}
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
                className="group col-span-full block overflow-hidden rounded-lg bg-white shadow-lg transition-transform hover:-translate-y-0.5">
                {/* wide cover banner, like the reference course card */}
                <div className="aspect-[2.4/1] w-full overflow-hidden bg-paper">
                  {it.img
                    ? <img src={it.img} alt="" className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center text-3xl text-inkmuted/40">{TYPE_META[it.type].icon || "🎓"}</div>}
                </div>
                <div className="p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-inkmuted">{TYPE_META[it.type].label}</div>
                  <div className="mt-1 line-clamp-2 font-display text-lg font-bold leading-snug text-ink">{it.title}</div>
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    {it.price === 0 ? (
                      <span className="text-xl font-extrabold text-ink">Free</span>
                    ) : (
                      <>
                        {it.mrp > 0 && <span className="text-base font-semibold text-inkmuted line-through">{inr(it.mrp)}</span>}
                        <span className="text-xl font-extrabold text-danger">{inr(it.price)}</span>
                        {off > 0 && <span className="text-base font-extrabold text-[#E0A800]">{off}% OFF</span>}
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
