"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/supabase";
import { DEFAULT_COMMENT_REPLIES, validateRule } from "@/lib/autodm";
import DmPreview from "./DmPreview";

const MODES = [
  { key: "contains", label: "Contains keyword", hint: "Fires when the comment includes one of your keywords." },
  { key: "exact", label: "Exact match", hint: "Fires only when the whole comment is the keyword." },
  { key: "any", label: "Any comment", hint: "Fires on every comment — no keyword needed." }
];

const blank = {
  name: "",
  media_id: null, media_permalink: null, media_thumbnail: null, media_caption: null,
  keywords: [], match_mode: "contains",
  dm_text: "", button_label: "", button_url: "",
  reply_to_comment: true, comment_replies: DEFAULT_COMMENT_REPLIES,
  once_per_user: false, active: true
};

export default function RuleModal({ open, rule, account, onClose, onSaved }) {
  const [form, setForm] = useState(blank);
  const [kw, setKw] = useState("");
  const [media, setMedia] = useState(null);
  const [pickingPost, setPickingPost] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (!open) return;
    setErr(""); setKw(""); setPickingPost(false);
    setForm(rule ? { ...blank, ...rule, keywords: rule.keywords || [], comment_replies: rule.comment_replies?.length ? rule.comment_replies : DEFAULT_COMMENT_REPLIES } : blank);
  }, [open, rule]);

  async function loadMedia() {
    setPickingPost(true);
    if (media) return;
    try {
      const res = await apiFetch("/api/autodm/media", undefined, "GET");
      setMedia(res.media || []);
    } catch (e) {
      setMediaError(e.message);
      setMedia([]);
    }
  }

  function addKeyword(raw) {
    const parts = String(raw).split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    set({ keywords: [...new Set([...form.keywords, ...parts])].slice(0, 20) });
    setKw("");
  }

  async function save() {
    const { errors } = validateRule(form);
    if (errors.length) { setErr(errors[0]); return; }
    setSaving(true); setErr("");
    try {
      const payload = { ...form, keywords: form.keywords };
      const res = rule
        ? await apiFetch(`/api/autodm/rules/${rule.id}`, payload, "PATCH")
        : await apiFetch("/api/autodm/rules", payload, "POST");
      onSaved(res.rule);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white sm:rounded-card" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold">{rule ? "Edit automation" : "New automation"}</h2>
            <p className="text-xs text-inkmuted">Comment on Instagram → instant DM.</p>
          </div>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-inkmuted hover:bg-paper">✕</button>
        </div>

        <div className="grid gap-6 px-5 py-5 sm:grid-cols-[1fr_260px]">
          <div className="space-y-5">
            <div>
              <label className="label">Name</label>
              <input className="input" placeholder='e.g. "GUIDE" → free PDF' value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </div>

            {/* ---- which post ---- */}
            <div>
              <label className="label">Which post?</label>
              <div className="flex flex-wrap gap-2">
                <button type="button"
                  onClick={() => set({ media_id: null, media_permalink: null, media_thumbnail: null, media_caption: null })}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${!form.media_id ? "border-ink bg-ink text-white" : "border-line bg-white text-inkmuted"}`}>
                  All posts &amp; reels
                </button>
                <button type="button" onClick={loadMedia}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${form.media_id ? "border-ink bg-ink text-white" : "border-line bg-white text-inkmuted"}`}>
                  {form.media_id ? "Specific post ✓" : "Pick a post"}
                </button>
              </div>

              {form.media_id && form.media_thumbnail && !pickingPost && (
                <div className="mt-3 flex items-center gap-3 rounded-[10px] border border-line p-2.5">
                  <img src={form.media_thumbnail} alt="" className="h-12 w-12 rounded object-cover" />
                  <div className="min-w-0 flex-1 truncate text-sm text-inkmuted">{form.media_caption || "Selected post"}</div>
                  <button type="button" onClick={loadMedia} className="text-sm font-semibold text-brand">Change</button>
                </div>
              )}

              {pickingPost && (
                <div className="mt-3 rounded-[10px] border border-line p-3">
                  {media === null && <div className="py-6 text-center text-sm text-inkmuted">Loading your posts…</div>}
                  {mediaError && <div className="py-4 text-center text-sm text-danger">{mediaError}</div>}
                  {media?.length === 0 && !mediaError && <div className="py-6 text-center text-sm text-inkmuted">No posts found on this account.</div>}
                  <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                    {(media || []).map((m) => (
                      <button key={m.id} type="button"
                        onClick={() => { set({ media_id: m.id, media_permalink: m.permalink, media_thumbnail: m.thumbnail, media_caption: m.caption.slice(0, 120) }); setPickingPost(false); }}
                        className={`relative aspect-square overflow-hidden rounded-lg border-2 ${form.media_id === m.id ? "border-brand" : "border-transparent"}`}>
                        {m.thumbnail
                          ? <img src={m.thumbnail} alt="" className="h-full w-full object-cover" />
                          : <span className="flex h-full w-full items-center justify-center bg-paper text-xs text-inkmuted">{m.type}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ---- trigger ---- */}
            <div>
              <label className="label">Trigger</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {MODES.map((m) => (
                  <button key={m.key} type="button" onClick={() => set({ match_mode: m.key })}
                    className={`rounded-[10px] border p-3 text-left text-sm ${form.match_mode === m.key ? "border-brand bg-brand-soft" : "border-line bg-white"}`}>
                    <div className="font-semibold">{m.label}</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-inkmuted">{m.hint}</div>
                  </button>
                ))}
              </div>

              {form.match_mode !== "any" && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {form.keywords.map((k) => (
                      <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-sm font-semibold">
                        {k}
                        <button type="button" onClick={() => set({ keywords: form.keywords.filter((x) => x !== k) })} className="text-inkmuted hover:text-danger">✕</button>
                      </span>
                    ))}
                  </div>
                  <input className="input mt-2" placeholder="Type a keyword and press Enter (LINK, GUIDE, PRICE…)"
                    value={kw}
                    onChange={(e) => setKw(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addKeyword(kw); } }}
                    onBlur={() => addKeyword(kw)} />
                  <p className="mt-1 text-[11px] text-inkmuted">Case doesn&apos;t matter. Emoji and punctuation are ignored.</p>
                </div>
              )}
            </div>

            {/* ---- the DM ---- */}
            <div>
              <label className="label">The DM<span className="req"> *</span></label>
              <textarea className="input min-h-[110px]" placeholder="Here's the free guide I promised 🎉 Tap below to grab it."
                value={form.dm_text} onChange={(e) => set({ dm_text: e.target.value })} maxLength={900} />
              <p className="mt-1 text-[11px] text-inkmuted">Use <code className="rounded bg-paper px-1">{"{{username}}"}</code> to greet them by handle. {900 - (form.dm_text || "").length} left.</p>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px]">
                <div>
                  <label className="label">Link (optional)</label>
                  <input className="input" placeholder="https://yourstore.com/guide" value={form.button_url || ""} onChange={(e) => set({ button_url: e.target.value })} />
                </div>
                <div>
                  <label className="label">Button</label>
                  <input className="input" placeholder="Get it now" maxLength={20} value={form.button_label || ""} onChange={(e) => set({ button_label: e.target.value })} />
                </div>
              </div>
            </div>

            {/* ---- public reply ---- */}
            <div className="rounded-[10px] border border-line p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">Reply publicly too</div>
                  <p className="mt-0.5 text-[11px] text-inkmuted">Replies under the comment so everyone sees it working. Big for reach.</p>
                </div>
                <button type="button" className="switch" data-on={form.reply_to_comment} onClick={() => set({ reply_to_comment: !form.reply_to_comment })}>
                  <span className="knob" />
                </button>
              </div>
              {form.reply_to_comment && (
                <textarea className="input mt-3 min-h-[74px]"
                  placeholder="One reply per line — we rotate them at random."
                  value={(form.comment_replies || []).join("\n")}
                  onChange={(e) => set({ comment_replies: e.target.value.split("\n") })} />
              )}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[10px] border border-line p-4">
              <div>
                <div className="text-sm font-semibold">Only once per person</div>
                <p className="mt-0.5 text-[11px] text-inkmuted">Skip anyone this automation has already messaged.</p>
              </div>
              <button type="button" className="switch" data-on={form.once_per_user} onClick={() => set({ once_per_user: !form.once_per_user })}>
                <span className="knob" />
              </button>
            </div>
          </div>

          <div className="sm:sticky sm:top-20 sm:self-start">
            <DmPreview account={account} dmText={form.dm_text} buttonLabel={form.button_label} buttonUrl={form.button_url}
              commentReply={(form.comment_replies || []).filter(Boolean)[0]} showComment={form.reply_to_comment} />
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-white px-5 py-4">
          <span className="text-sm text-danger">{err}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-brand">{saving ? "Saving…" : rule ? "Save changes" : "Turn it on"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
