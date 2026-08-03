"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { TYPE_META } from "@/lib/products";
import { validateProduct } from "@/lib/validate";
import { fetchMe } from "@/lib/plan";
import SubscriptionModal from "@/components/SubscriptionModal";
import PreviewFrame from "@/components/studio/PreviewFrame";

/**
 * Generic full-screen editor for mp_products rows (event / locked / payment).
 * Form: ({product, patch, patchData}) => JSX; View: public renderer for preview.
 */
export default function EditorShell({ type, backHref, Form, View }) {
  const { id } = useParams();
  const r = useRouter();
  const [product, setProduct] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [issues, setIssues] = useState([]);
  const [showSub, setShowSub] = useState(false);
  const saveRef = useRef(() => {});

  useEffect(() => {
    supabase.from("mp_products").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error || !data) { r.replace(backHref); return; }
      setProduct(data);
    });
  }, [id, r, backHref]);

  // Auto-save 900ms after the last edit (hook stays above any early return).
  useEffect(() => {
    if (!dirty || !product) return;
    const t = setTimeout(() => saveRef.current(), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, dirty]);

  if (!product) return <div className="flex min-h-screen items-center justify-center text-inkmuted">Loading…</div>;

  const patch = (p) => { setProduct((c) => ({ ...c, ...p })); setDirty(true); setSaved(false); setIssues([]); };
  const patchData = (p) => { setProduct((c) => ({ ...c, data: { ...c.data, ...p } })); setDirty(true); setSaved(false); setIssues([]); };

  async function persist(status, skipValidate = false) {
    setErr(""); setIssues([]);
    if (status === "published" && !skipValidate) {
      const problems = validateProduct(type, product);
      if (problems.length) { setIssues(problems); return false; }
    }
    const { error } = await supabase.from("mp_products")
      .update({ title: product.title, slug: product.slug || null, status, data: product.data, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { setErr(error.message.includes("duplicate") ? "That page URL is already taken." : error.message); return false; }
    setProduct((c) => ({ ...c, status }));
    setDirty(false);
    return true;
  }

  async function save() {
    setSaving(true);
    const ok = await persist(product.status === "published" ? "published" : product.status, true);
    setSaving(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }
  saveRef.current = save;

  async function publish() {
    const me = await fetchMe();
    if (!me.isPro) { setShowSub(true); return; }
    setPublishing(true);
    const ok = await persist("published");
    setPublishing(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  async function publishFree() {
    setShowSub(false);
    setPublishing(true);
    const ok = await persist("published");
    setPublishing(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  async function unpublish() {
    setPublishing(true);
    await persist("unpublished");
    setPublishing(false);
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex min-h-screen w-full flex-col border-r border-line bg-white lg:w-[420px] lg:shrink-0 xl:w-[480px]">
        <header className="flex items-center gap-3 border-b border-line px-7 py-4">
          <Link href={backHref} className="rounded-lg p-1.5 text-inkmuted hover:bg-paper hover:text-ink" aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </Link>
          <span className="truncate text-sm font-bold uppercase tracking-wide">{product.title}</span>
          <span className={`pill ml-auto ${product.status === "published" ? "bg-teal-soft text-teal" : "bg-paper text-inkmuted"}`}>{product.status}</span>
        </header>
        <div className="flex-1 overflow-y-auto px-7 py-8 pb-32">
          <Form product={product} patch={patch} patchData={patchData} />
        </div>
        {issues.length > 0 && (
          <div className="sticky bottom-[57px] border-t border-line bg-red-50 px-7 py-3">
            <p className="text-sm font-semibold text-danger">Finish these before publishing:</p>
            <ul className="mt-1.5 space-y-1">
              {issues.map((it, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-danger/90">
                  <span className="mt-0.5">•</span><span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <footer className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-white/90 px-7 py-3.5 backdrop-blur">
          {err ? <span className="text-sm text-danger">{err}</span>
            : saving ? <span className="text-sm text-inkmuted">Saving…</span>
            : saved ? <span className="text-sm font-semibold text-teal">Saved ✓</span>
            : dirty ? <span className="text-sm text-inkmuted">Auto-saving…</span>
            : <span className="text-sm text-inkmuted">All changes saved automatically</span>}
          <div className="ml-auto flex items-center gap-2.5">
            {product.status === "published" ? (
              <>
                <a href={`${TYPE_META[type].publicPath}/${product.slug}`} target="_blank" className="btn-ghost">View live ↗</a>
                <button onClick={unpublish} disabled={publishing} className="btn-ghost">Unpublish</button>
                <button onClick={save} disabled={saving || !dirty} className="btn-ink">{saving ? "Saving…" : "Save changes"}</button>
              </>
            ) : (
              <>
                <button onClick={save} disabled={saving || !dirty} className="btn-ghost">{saving ? "Saving…" : "Save draft"}</button>
                <button onClick={publish} disabled={publishing} className="btn-brand">{publishing ? "Publishing…" : "Publish →"}</button>
              </>
            )}
          </div>
        </footer>
      </div>
      <div className="hidden min-w-0 flex-1 lg:block">
        <PreviewFrame url={`supercreators.in${TYPE_META[type].publicPath}/${product.slug || "your-page"}`}>
          <View product={product} mode="preview" />
        </PreviewFrame>
      </div>
      {showSub && (
        <SubscriptionModal onClose={() => setShowSub(false)}
          onSuccess={() => { setShowSub(false); publish(); }}
          onFree={publishFree} />
      )}
    </div>
  );
}

