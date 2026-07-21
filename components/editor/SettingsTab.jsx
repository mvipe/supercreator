"use client";
import { useState } from "react";
import { Field, RadioCard, SectionCard, Switch } from "@/components/ui";
import { slugify, uid } from "@/lib/courseModel";

const THEMES = [
  { id: "default", label: "Default", desc: "Warm paper, ink text" },
  { id: "light", label: "Light", desc: "Clean white" },
  { id: "dark", label: "Dark", desc: "Ink background" }
];
const ACCENTS = ["#2E6EF7", "#0E9F6E", "#B3261E", "#7C3AED", "#EA580C", "#C2185B"];

export default function SettingsTab({ course, patch }) {
  const st = course.settings;
  const set = (p) => patch({ settings: { ...st, ...p } });
  const [couponDraft, setCouponDraft] = useState({ code: "", percentOff: 10 });

  return (
    <div className="space-y-8">
      {/* Theme */}
      <div>
        <h2 className="font-display text-xl font-bold">Theme and styling</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          {THEMES.map((t) => (
            <RadioCard key={t.id} checked={st.theme === t.id} title={t.label} desc={t.desc} onClick={() => set({ theme: t.id })} />
          ))}
        </div>
        <div className="mt-4">
          <label className="label">Accent colour</label>
          <div className="flex items-center gap-2">
            {ACCENTS.map((c) => (
              <button key={c} type="button" onClick={() => set({ accent: c })} aria-label={c}
                className={`h-8 w-8 rounded-full border-2 ${st.accent === c ? "border-ink" : "border-transparent"}`}
                style={{ background: c }} />
            ))}
            <input type="color" value={st.accent} onChange={(e) => set({ accent: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border border-line" title="Custom colour" />
          </div>
          <p className="mt-1.5 text-xs text-inkmuted">Used on your public course page for buttons and highlights.</p>
        </div>
      </div>

      {/* Page URL */}
      <div>
        <h2 className="font-display text-xl font-bold">Page URL</h2>
        <div className="mt-3">
          <div className="flex overflow-hidden rounded-[10px] border border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
            <span className="flex items-center border-r border-line bg-paper px-3 text-sm text-inkmuted">/c/</span>
            <input className="w-full px-3.5 py-2.5 text-sm outline-none" placeholder="gym-training-course"
              value={course.slug || ""} onChange={(e) => patch({ slug: slugify(e.target.value) || null })} />
          </div>
          <p className="mt-1.5 text-xs text-inkmuted">Required before you can publish. Lowercase letters, numbers and dashes only.</p>
        </div>
      </div>

      {/* Checkout */}
      <div>
        <h2 className="font-display text-xl font-bold">Checkout experience</h2>
        <p className="mt-1 text-sm text-inkmuted">Buyers sign in with phone OTP, then answer these questions before payment.</p>
        <div className="mt-4 space-y-3">
          {st.checkoutQuestions.map((q, i) => (
            <div key={q.id} className="card flex flex-wrap items-center gap-3 p-3">
              <input className="input flex-1" value={q.label}
                onChange={(e) => set({ checkoutQuestions: st.checkoutQuestions.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
              <select className="input w-28 shrink-0" value={q.type}
                onChange={(e) => set({ checkoutQuestions: st.checkoutQuestions.map((x, j) => j === i ? { ...x, type: e.target.value } : x) })}>
                <option value="text">Text</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
              </select>
              <label className="flex shrink-0 items-center gap-2 text-xs font-semibold">
                Required
                <Switch on={q.required} onChange={(v) => set({ checkoutQuestions: st.checkoutQuestions.map((x, j) => j === i ? { ...x, required: v } : x) })} />
              </label>
              <button type="button" className="shrink-0 text-xs font-semibold text-danger"
                onClick={() => set({ checkoutQuestions: st.checkoutQuestions.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          <button type="button" className="text-sm font-semibold text-brand"
            onClick={() => set({ checkoutQuestions: [...st.checkoutQuestions, { id: uid(), label: "New question", type: "text", required: false }] })}>
            + Add question
          </button>
        </div>
      </div>

      {/* Coupons */}
      <div>
        <h2 className="font-display text-xl font-bold">Discount coupons</h2>
        <div className="mt-4 space-y-2">
          {(st.coupons || []).map((c, i) => (
            <div key={c.code} className="card flex items-center gap-3 p-3">
              <span className="rounded bg-brand-soft px-2 py-1 font-mono text-sm font-bold text-brand-dark">{c.code}</span>
              <span className="text-sm">{c.percentOff}% off</span>
              <label className="ml-auto flex items-center gap-2 text-xs font-semibold">
                Active
                <Switch on={c.active} onChange={(v) => set({ coupons: st.coupons.map((x, j) => j === i ? { ...x, active: v } : x) })} />
              </label>
              <button type="button" className="text-xs font-semibold text-danger" onClick={() => set({ coupons: st.coupons.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          <form className="flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            const code = couponDraft.code.trim().toUpperCase();
            if (!code) return;
            if ((st.coupons || []).some((c) => c.code === code)) { alert("That code already exists."); return; }
            set({ coupons: [...(st.coupons || []), { code, percentOff: Math.min(100, Math.max(1, Number(couponDraft.percentOff))), active: true }] });
            setCouponDraft({ code: "", percentOff: 10 });
          }}>
            <input className="input uppercase" placeholder="CODE" value={couponDraft.code}
              onChange={(e) => setCouponDraft({ ...couponDraft, code: e.target.value })} />
            <input className="input w-24 shrink-0" type="number" min="1" max="100" value={couponDraft.percentOff}
              onChange={(e) => setCouponDraft({ ...couponDraft, percentOff: e.target.value })} />
            <span className="flex items-center text-sm text-inkmuted">%</span>
            <button className="btn-ghost shrink-0" type="submit">+ Add</button>
          </form>
        </div>
      </div>

      {/* Post purchase */}
      <div>
        <h2 className="font-display text-xl font-bold">Post-purchase behaviour</h2>
        <div className="mt-3">
          <Field label="Message shown after purchase">
            <textarea className="input min-h-[80px]" value={st.postPurchaseMessage} onChange={(e) => set({ postPurchaseMessage: e.target.value })} />
          </Field>
        </div>
      </div>

      {/* Certificate */}
      <SectionCard title="Course completion certificate" on={st.certificate} onToggle={(v) => set({ certificate: v })}>
        <p className="mt-1 text-xs text-inkmuted">Learners can download a completion certificate once every lesson is marked done.</p>
      </SectionCard>

      {/* Terms and policies */}
      <div>
        <h2 className="font-display text-xl font-bold">Terms and policies</h2>
        <div className="mt-4 space-y-4">
          <Field label="Terms and conditions"><textarea className="input min-h-[80px]" value={st.terms} onChange={(e) => set({ terms: e.target.value })} /></Field>
          <Field label="Refund policy"><textarea className="input min-h-[80px]" value={st.refundPolicy} onChange={(e) => set({ refundPolicy: e.target.value })} /></Field>
          <Field label="Privacy policy"><textarea className="input min-h-[80px]" value={st.privacyPolicy} onChange={(e) => set({ privacyPolicy: e.target.value })} /></Field>
        </div>
      </div>

      {/* Tracking */}
      <div>
        <h2 className="font-display text-xl font-bold">Tracking</h2>
        <div className="mt-4 space-y-4">
          <Field label="Meta Pixel ID" hint="Run re-marketing campaigns on Meta Business">
            <input className="input" placeholder="123456789012345" value={st.metaPixelId} onChange={(e) => set({ metaPixelId: e.target.value })} />
          </Field>
          <Field label="Google Analytics ID" hint="Visitor-level data on your GA dashboard">
            <input className="input" placeholder="G-XXXXXXXXXX" value={st.gaId} onChange={(e) => set({ gaId: e.target.value })} />
          </Field>
        </div>
      </div>
    </div>
  );
}
