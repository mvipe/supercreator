"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { slugify, uploadImage } from "@/lib/courseModel";
import { Field } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import { THEMES, FONTS, themeSurface } from "@/lib/storeTheme";
import { SocialIcon, socialLabel } from "@/components/BrandIcons";
import StoreAnalytics from "@/components/store/StoreAnalytics";
import StorePreview from "@/components/store/StorePreview";

const TABS = ["Store", "Analytics", "Appearance", "Settings"];

export default function StorePage() {
  const { user } = useAuth();
  const [p, setP] = useState(null);
  const [tab, setTab] = useState("Store");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [hasSessions, setHasSessions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("mp_profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setP(data || { user_id: user.id, socials: {}, links: [], theme: "classic", brand_color: "#2E6EF7", font: "Inter", column_layout: "single" });
    });
    supabase.from("mp_sessions").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("active", true)
      .then(({ count }) => setHasSessions((count || 0) > 0));
  }, [user]);

  // Debounced autosave — persist ~1.2s after the last edit so switching tabs or
  // leaving the page never loses work. The Save button stays for an explicit save.
  useEffect(() => {
    if (!p || !dirty || saving) return;
    const t = setTimeout(() => { save(); }, 1200);
    return () => clearTimeout(t);
  }, [p, dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return <div className="flex min-h-screen items-center justify-center text-inkmuted">Loading…</div>;

  const patch = (x) => { setP({ ...p, ...x }); setDirty(true); setMsg(""); };
  const socials = p.socials || {};
  const links = p.links || [];
  const storeUrl = p.username ? `/${p.username}` : null;

  async function save() {
    setSaving(true);
    const base = {
      user_id: user.id,
      username: p.username || null,
      display_name: p.display_name || "",
      bio: p.bio || "",
      avatar_url: p.avatar_url || "",
      socials,
      theme: p.theme || "classic",
      brand_color: p.brand_color || "#2E6EF7",
      font: p.font || "Inter",
      links,
      meta_title: p.meta_title || "",
      meta_description: p.meta_description || "",
      sensitive_content: !!p.sensitive_content,
      column_layout: p.column_layout || "single",
      fb_pixel: p.fb_pixel || "",
      ga_id: p.ga_id || ""
    };

    let { error } = await supabase.from("mp_profiles").upsert({ ...base, bg_image: p.bg_image || "" });
    // If the bg_image column isn't migrated yet, still save everything else.
    if (error && /bg_image/i.test(error.message || "")) {
      ({ error } = await supabase.from("mp_profiles").upsert(base));
    }
    setSaving(false);
    if (error) { setMsg(error.message.includes("duplicate") ? "That username is taken — try another." : error.message); return; }
    setDirty(false); setMsg("Saved ✓"); setTimeout(() => setMsg(""), 2500);
  }

  async function onBg(files) {
    if (!files?.[0]) return;
    setBgUploading(true);
    try { const url = await uploadImage(user.id, files[0]); patch({ bg_image: url }); }
    catch (e) { setMsg(e.message); }
    finally { setBgUploading(false); }
  }

  async function onAvatar(files) {
    if (!files?.[0]) return;
    const url = await uploadImage(user.id, files[0]);
    patch({ avatar_url: url });
  }
  function copyLink() {
    if (!storeUrl) return;
    const url = window.location.origin + storeUrl;
    try { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { window.prompt("Copy link:", url); }
  }

  // Link (button) editor helpers
  const addLink = () => patch({ links: [...links, { label: "New link", url: "" }] });
  const updateLink = (i, x) => patch({ links: links.map((l, j) => j === i ? { ...l, ...x } : l) });
  const removeLink = (i) => patch({ links: links.filter((_, j) => j !== i) });

  return (
    <div className="flex min-h-full flex-col">
      {/* Top bar: tabs + URL + share */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-3 sm:px-8">
        <nav className="-mx-1 flex w-full gap-5 overflow-x-auto px-1 sm:w-auto sm:gap-6 sm:overflow-visible">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`relative py-2 text-sm font-semibold transition-colors ${tab === t ? "text-brand" : "text-inkmuted hover:text-ink"}`}>
              {t}
              {tab === t && <span className="absolute -bottom-[13px] left-0 h-0.5 w-full bg-brand" />}
            </button>
          ))}
        </nav>
        <div className="flex w-full min-w-0 items-center gap-2 sm:ml-auto sm:w-auto">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm sm:flex-none">
            <span className="min-w-0 truncate text-inkmuted">🌐 supercreators.in{storeUrl || "/…"}</span>
            {storeUrl && <button onClick={copyLink} className="shrink-0 text-brand">{copied ? "✓" : "⧉"}</button>}
          </div>
          {storeUrl && <a href={storeUrl} target="_blank" className="btn-ink shrink-0">Share ↗</a>}
        </div>
      </div>

      <div className={`grid flex-1 gap-8 px-4 py-6 sm:px-8 sm:py-8 ${tab === "Analytics" ? "lg:grid-cols-1" : "lg:grid-cols-[1fr_360px]"}`}>
        <div className="min-w-0 space-y-6">
          {/* ---------------- STORE TAB ---------------- */}
          {tab === "Store" && (
            <>
              {storeUrl
                ? <div className="card flex flex-wrap items-center gap-3 p-4"><span className="text-sm">🚀 Your store is live: <a href={storeUrl} target="_blank" className="font-semibold text-brand hover:underline">supercreators.in{storeUrl}</a></span></div>
                : <div className="card p-4 text-sm text-inkmuted">Pick a username below to make your store live.</div>}

              <div className="card space-y-5 p-5">
                <h2 className="font-display text-lg font-bold">Store header</h2>
                <Field label="Username" required hint="Your store is at supercreators.in/username and bookings at /book/username">
                  <div className="flex overflow-hidden rounded-[10px] border border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                    <span className="flex items-center border-r border-line bg-paper px-3 text-sm text-inkmuted">supercreators.in/</span>
                    <input className="w-full px-3.5 py-2.5 text-sm outline-none" value={p.username || ""} onChange={(e) => patch({ username: slugify(e.target.value) || null })} />
                  </div>
                </Field>
                <Field label="Display name"><input className="input" maxLength={40} value={p.display_name || ""} onChange={(e) => patch({ display_name: e.target.value })} /></Field>
                <Field label="Bio / tagline"><textarea className="input min-h-[70px]" maxLength={160} value={p.bio || ""} onChange={(e) => patch({ bio: e.target.value })} /></Field>
                <Field label="Avatar">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-full border border-line bg-paper">{p.avatar_url && <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />}</div>
                    <label className="btn-ghost cursor-pointer">Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files)} /></label>
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  {["instagram", "youtube", "x", "website"].map((k) => (
                    <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
                      <input className="input" placeholder="https://…" value={socials[k] || ""} onChange={(e) => patch({ socials: { ...socials, [k]: e.target.value } })} />
                    </Field>
                  ))}
                </div>
              </div>

              <div className="card space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg font-bold">Add header</h2>
                    <p className="text-sm text-inkmuted">Include a top heading and social icons for your store page.</p>
                  </div>
                  <button onClick={addLink} className="btn-ghost">+ Add header</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(socials).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white/80 px-3 py-2 text-sm font-semibold">
                      <SocialIcon name={k} size={22} className="rounded-md" />
                      {socialLabel(k)}
                    </div>
                  ))}
                </div>
                {links.length === 0 && <p className="text-sm text-inkmuted">Add buttons to your store — a newsletter, WhatsApp, YouTube video, anything.</p>}
                {links.map((l, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input className="input flex-1" placeholder="Label (e.g. Join my WhatsApp)" value={l.label} onChange={(e) => updateLink(i, { label: e.target.value })} />
                    <input className="input flex-1" placeholder="https://…" value={l.url} onChange={(e) => updateLink(i, { url: e.target.value })} />
                    <button onClick={() => removeLink(i)} className="shrink-0 text-sm font-semibold text-danger">✕</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ---------------- APPEARANCE TAB ---------------- */}
          {tab === "Analytics" && <StoreAnalytics />}

          {tab === "Appearance" && (
            <>
              <div className="card space-y-4 p-5">
                <h2 className="font-display text-lg font-bold">Theme</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Object.entries(THEMES).map(([id, th]) => (
                    <button key={id} onClick={() => patch({ theme: id })}
                      className={`overflow-hidden rounded-xl border-2 text-left transition-all ${p.theme === id ? "border-brand ring-2 ring-brand/20" : "border-line hover:border-brand/40"}`}>
                      {/* swatch uses the same textured surface as the live store */}
                      <div className="h-20" style={{ ...themeSurface(th, { strength: 0.85 }), backgroundAttachment: "scroll, scroll, scroll, scroll, scroll" }} />
                      <div className="px-3 py-2 text-sm font-semibold">{th.name}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="card space-y-5 p-5">
                <h2 className="font-display text-lg font-bold">Style</h2>
                <Field label="Brand color" hint="Used for your primary buttons">
                  <div className="flex items-center gap-3">
                    <input type="color" value={p.brand_color || "#2E6EF7"} onChange={(e) => patch({ brand_color: e.target.value })} className="h-10 w-14 cursor-pointer rounded border border-line" />
                    <input className="input max-w-[140px]" value={p.brand_color || ""} onChange={(e) => patch({ brand_color: e.target.value })} />
                  </div>
                </Field>
                <Field label="Font">
                  <select className="input max-w-xs" value={p.font || "Inter"} onChange={(e) => patch({ font: e.target.value })}>
                    {FONTS.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </Field>
              </div>

              <div className="card space-y-4 p-5">
                <div>
                  <h2 className="font-display text-lg font-bold">Custom background</h2>
                  <p className="mt-0.5 text-sm text-inkmuted">Upload your own background image — it overrides the theme and stays saved until you change or remove it.</p>
                </div>
                {p.bg_image ? (
                  <div className="space-y-3">
                    <div className="h-36 w-full overflow-hidden rounded-xl border border-line bg-cover bg-center" style={{ backgroundImage: `url(${p.bg_image})` }} />
                    <div className="flex items-center gap-3">
                      <label className="btn-ghost cursor-pointer text-sm">{bgUploading ? "Uploading…" : "Replace image"}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => onBg(e.target.files)} disabled={bgUploading} />
                      </label>
                      <button type="button" className="text-sm font-semibold text-danger" onClick={() => patch({ bg_image: "" })}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-6 py-8 text-center text-sm text-inkmuted hover:border-brand hover:text-brand ${bgUploading ? "opacity-60" : ""}`}>
                    <span className="text-2xl">🖼️</span>
                    <span>{bgUploading ? "Uploading…" : "Upload background image (JPG / PNG)"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onBg(e.target.files)} disabled={bgUploading} />
                  </label>
                )}
              </div>
            </>
          )}

          {/* ---------------- SETTINGS TAB ---------------- */}
          {tab === "Settings" && (
            <>
              <div className="card space-y-5 p-5">
                <h2 className="font-display text-lg font-bold">Store details</h2>
                <Field label="Your store's official link">
                  <div className="flex overflow-hidden rounded-[10px] border border-line">
                    <span className="flex items-center border-r border-line bg-paper px-3 text-sm text-inkmuted">supercreators.in/</span>
                    <input className="w-full px-3.5 py-2.5 text-sm outline-none" value={p.username || ""} onChange={(e) => patch({ username: slugify(e.target.value) || null })} />
                  </div>
                </Field>
                <Field label="Brand color">
                  <div className="flex items-center gap-3">
                    <input type="color" value={p.brand_color || "#2E6EF7"} onChange={(e) => patch({ brand_color: e.target.value })} className="h-10 w-14 cursor-pointer rounded border border-line" />
                    <span className="text-sm text-inkmuted">{p.brand_color}</span>
                  </div>
                </Field>
              </div>

              <div className="card space-y-5 p-5">
                <h2 className="font-display text-lg font-bold">SEO · Custom meta</h2>
                <Field label="Meta title"><input className="input" value={p.meta_title || ""} onChange={(e) => patch({ meta_title: e.target.value })} placeholder={p.display_name || "Your name"} /></Field>
                <Field label="Meta description"><textarea className="input min-h-[70px]" value={p.meta_description || ""} onChange={(e) => patch({ meta_description: e.target.value })} placeholder="Welcome to my SuperCreators store!" /></Field>
                <p className="text-xs text-inkmuted">Note: changes to meta may take some time to appear on other platforms.</p>
              </div>

              <div className="card space-y-5 p-5">
                <h2 className="font-display text-lg font-bold">Desktop view</h2>
                <Field label="Column layout">
                  <select className="input max-w-xs" value={p.column_layout || "single"} onChange={(e) => patch({ column_layout: e.target.value })}>
                    <option value="single">Single column</option>
                    <option value="double">Two columns</option>
                  </select>
                </Field>
              </div>

              <div className="card flex items-center justify-between p-5">
                <div>
                  <h2 className="font-display text-lg font-bold">Sensitive content warning</h2>
                  <p className="text-sm text-inkmuted">Show a content warning before your store opens.</p>
                </div>
                <button onClick={() => patch({ sensitive_content: !p.sensitive_content })}
                  className={`relative h-6 w-11 rounded-full transition-colors ${p.sensitive_content ? "bg-brand" : "bg-line"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${p.sensitive_content ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>

              <div className="card space-y-5 p-5">
                <h2 className="font-display text-lg font-bold">Analytics integration</h2>
                <Field label="Facebook Pixel ID"><input className="input" value={p.fb_pixel || ""} onChange={(e) => patch({ fb_pixel: e.target.value })} placeholder="Pixel ID" /></Field>
                <Field label="Google Analytics ID"><input className="input" value={p.ga_id || ""} onChange={(e) => patch({ ga_id: e.target.value })} placeholder="G-XXXXXXX" /></Field>
              </div>
            </>
          )}

          <div className="sticky bottom-0 -mx-8 flex items-center gap-3 border-t border-line bg-white/90 px-8 py-3 backdrop-blur">
            <button onClick={save} disabled={saving || !dirty} className="btn-brand">{saving ? "Saving…" : "Save changes"}</button>
            {msg && <span className={`text-sm font-semibold ${msg.includes("✓") ? "text-teal" : "text-danger"}`}>{msg}</span>}
            {dirty && !msg && <span className="text-sm text-inkmuted">Autosaving…</span>}
            {!dirty && !msg && !saving && <span className="text-sm text-inkmuted">All changes saved automatically</span>}
          </div>
        </div>

        {/* Live preview */}
        {tab !== "Analytics" && (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <StorePreview profile={p} links={links} hasSessions={hasSessions} />
              <p className="mt-4 text-center text-xs text-inkmuted">Live preview</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
