"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { inr } from "@/lib/courseModel";
import { PRODUCT_DEFAULTS, TYPE_META, productPrice } from "@/lib/products";
import { StatsHero, StatusTabs, RowMenu } from "@/components/dashboard/Hub";
import { useAuth } from "@/components/AuthProvider";

const TABS = ["published", "unpublished", "draft"];

export default function ProductHub({ type, title, subtitle, ctaLabel }) {
  const { user, ownerId } = useAuth();
  const r = useRouter();
  const [rows, setRows] = useState([]);
  const [sales, setSales] = useState([]);
  const [tab, setTab] = useState("published");
  const [q, setQ] = useState("");
  const [menuFor, setMenuFor] = useState(null);

  async function load() {
    const { data } = await supabase.from("mp_products").select("*").eq("owner_id", ownerId).eq("type", type).order("updated_at", { ascending: false });
    setRows(data || []);
    const { data: p } = await supabase.from("mp_purchases").select("product_id, amount").eq("owner_id", ownerId).eq("product_type", type);
    setSales(p || []);
  }
  useEffect(() => { if (user) load(); }, [user]);

  const per = useMemo(() => {
    const m = {};
    for (const p of sales) { m[p.product_id] = m[p.product_id] || { sales: 0, rev: 0 }; m[p.product_id].sales++; m[p.product_id].rev += (p.amount || 0) / 100; }
    return m;
  }, [sales]);
  const totals = useMemo(() => {
    const s = sales.length, rev = sales.reduce((a, p) => a + (p.amount || 0), 0) / 100;
    const views = rows.reduce((a, c) => a + (c.views || 0), 0);
    return { s, rev, conv: views ? ((s / views) * 100).toFixed(1) + "%" : "0%" };
  }, [sales, rows]);

  const list = rows.filter((c) => c.status === tab).filter((c) => c.title.toLowerCase().includes(q.toLowerCase()));
  const counts = Object.fromEntries(TABS.map((t) => [t, rows.filter((c) => c.status === t).length]));

  async function create() {
    const d = PRODUCT_DEFAULTS[type];
    const { data, error } = await supabase.from("mp_products").insert({ owner_id: ownerId, type, title: d.title, status: "draft", data: d.data }).select("id").single();
    if (error) return alert(error.message);
    r.push(`/studio/${type}/${data.id}`);
  }
  async function setStatus(c, status) {
    setMenuFor(null);
    if (status === "published" && !c.slug) { alert("Set a page URL in the editor before publishing."); r.push(`/studio/${type}/${c.id}`); return; }
    const { error } = await supabase.from("mp_products").update({ status, updated_at: new Date().toISOString() }).eq("id", c.id);
    if (error) alert(error.message); else { setTab(status); load(); }
  }
  async function remove(c) {
    setMenuFor(null);
    if (!confirm(`Delete "${c.title}"?`)) return;
    await supabase.from("mp_products").delete().eq("id", c.id);
    load();
  }

  return (
    <main onClick={() => setMenuFor(null)}>
      <StatsHero title={title} subtitle={subtitle} cta={ctaLabel} onCta={create}
        stats={[["Total sales", totals.s], ["Total revenue", inr(totals.rev)], ["Conversion rate", totals.conv]]} />
      <section className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center gap-3">
          <StatusTabs tabs={TABS} tab={tab} setTab={setTab} counts={counts} />
          <input className="input ml-auto max-w-xs" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="card mt-5">
          <div className="grid grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
            <div className="col-span-5">{TYPE_META[type].label}</div><div className="col-span-2">Price</div>
            <div className="col-span-2">Sales</div><div className="col-span-2">Revenue</div><div className="col-span-1" />
          </div>
          {list.length === 0 && (
            <div className="px-5 py-14 text-center">
              <p className="font-display text-lg font-bold">No {tab} {title.toLowerCase()} yet</p>
              <button onClick={create} className="btn-ink mt-4">+ {ctaLabel}</button>
            </div>
          )}
          {list.map((c) => {
            const st = per[c.id] || { sales: 0, rev: 0 };
            const price = productPrice(type, c.data || {});
            return (
              <div key={c.id} className="relative grid grid-cols-12 items-center gap-4 border-b border-line px-5 py-4 last:border-0 hover:bg-paper/60">
                <Link href={`/studio/${type}/${c.id}`} className="col-span-5 flex min-w-0 items-center gap-3">
                  <div className="h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-paper">
                    {(c.data?.coverImages?.[0] || c.data?.images?.[0]) && <img src={c.data.coverImages?.[0] || c.data.images?.[0]} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 truncate font-semibold">{c.title}</div>
                </Link>
                <div className="col-span-2 text-sm font-semibold">{price === 0 ? "Free" : inr(price)}</div>
                <div className="col-span-2 text-sm">{st.sales}</div>
                <div className="col-span-2 text-sm">{inr(st.rev)}</div>
                <div className="col-span-1">
                  <RowMenu open={menuFor === c.id} onToggle={() => setMenuFor(menuFor === c.id ? null : c.id)}>
                    <Link href={`/studio/${type}/${c.id}`} className="block px-4 py-2.5 text-sm hover:bg-paper">Edit</Link>
                    {c.status !== "published" && <button onClick={() => setStatus(c, "published")} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-paper">Publish</button>}
                    {c.status === "published" && <button onClick={() => setStatus(c, "unpublished")} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-paper">Unpublish</button>}
                    {c.slug && c.status === "published" && <a href={`${TYPE_META[type].publicPath}/${c.slug}`} target="_blank" className="block px-4 py-2.5 text-sm hover:bg-paper">View live page</a>}
                    <button onClick={() => remove(c)} className="block w-full px-4 py-2.5 text-left text-sm text-danger hover:bg-red-50">Delete</button>
                  </RowMenu>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
