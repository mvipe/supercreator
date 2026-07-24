"use client";
import { themeWithBrand, themeSurface } from "@/lib/storeTheme";
import { SHEEN } from "@/lib/texture";
import { SocialIcon } from "@/components/BrandIcons";

// Live phone-style preview shared across Store/Appearance tabs.
export default function StorePreview({ profile, links = [], hasSessions = false, scale = 1 }) {
  const t = themeWithBrand(profile.theme, profile.brand_color);
  const s = profile.socials || {};
  const font = profile.font || "Inter";
  // Mirror the live store: name is the heading, @username is the sub-line.
  const creatorName = profile.display_name || profile.full_name || profile.business_name || "";

  return (
    <div className="relative mx-auto w-[300px] overflow-hidden rounded-[36px] border-[6px] border-[#1c1c1c] shadow-2xl"
      style={{
        ...themeSurface(t, { strength: 0.7 }),
        backgroundAttachment: "scroll, scroll, scroll, scroll, scroll", // `fixed` misbehaves inside a scaled preview
        fontFamily: `'${font}', sans-serif`,
        transform: `scale(${scale})`,
        transformOrigin: "top center"
      }}>
      {/* matches the sheen on the live store so the preview is honest */}
      <div className="pointer-events-none absolute inset-0" style={SHEEN} />

      <div className="relative min-h-[560px] px-5 pb-10 pt-9 text-center">
        <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 shadow-lg" style={{ borderColor: t.sub }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            : <div className="flex h-full w-full items-center justify-center text-2xl font-bold" style={{ background: "rgba(255,255,255,0.15)", color: t.text }}>{(creatorName || "A")[0]?.toUpperCase()}</div>}
        </div>
        <div className="mt-3 font-bold" style={{ color: t.text, fontSize: 18 }}>
          {creatorName || (profile.username ? `@${profile.username}` : "Your name")}
        </div>
        {creatorName && profile.username && (
          <div className="mt-0.5 text-xs opacity-70" style={{ color: t.sub }}>@{profile.username}</div>
        )}
        <div className="mt-1 text-sm" style={{ color: t.sub }}>{profile.bio || "Welcome to my SuperCreators store 🚀"}</div>

        {/* real brand marks, matching the live store (was a letter in a box) */}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {Object.entries(s).filter(([, v]) => v).map(([k]) => (
            <span key={k} className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.15)" }}>
              <SocialIcon name={k} size={18} className="rounded" />
            </span>
          ))}
        </div>

        <div className="mt-6 space-y-2.5 text-left">
          {hasSessions && (
            <div className="rounded-xl py-3 text-center text-sm font-bold shadow" style={{ background: t.btn, color: t.btnText }}>Book a session with me</div>
          )}
          {links.map((l, i) => (
            <div key={i} className="rounded-xl border py-3 text-center text-sm font-semibold backdrop-blur-sm" style={{ borderColor: t.btnBorder, color: t.text, background: "rgba(255,255,255,0.08)" }}>{l.label || "Link"}</div>
          ))}
          {!hasSessions && links.length === 0 && (
            <>
              <div className="rounded-xl border py-3 text-center text-sm font-semibold backdrop-blur-sm" style={{ borderColor: t.btnBorder, color: t.text, background: "rgba(255,255,255,0.08)" }}>My courses</div>
              <div className="rounded-xl border py-3 text-center text-sm font-semibold backdrop-blur-sm" style={{ borderColor: t.btnBorder, color: t.text, background: "rgba(255,255,255,0.08)" }}>Exclusive content</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}