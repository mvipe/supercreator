"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/supabase";
import { inr } from "@/lib/courseModel";

// =============================================================
// Admin → Refer & Earn. Everything about the programme is controlled here:
// on/off, what earns a reward, how much, approval, caps, the text creators
// see — plus the reward queue, a referrer leaderboard, manual bonuses and a
// per-creator kill switch.
// =============================================================

const TRIGGERS = [
  ["first_pro", "Referred creator buys Pro (first payment only)"],
  ["every_pro", "Every Pro payment by a referred creator"],
  ["signup", "Referred creator signs up"]
];
const STATUS_TABS = ["pending", "approved", "rejected", "all"];
const ST = { pending: "bg-[#FEF3C7] text-[#92600A]", approved: "bg-teal-soft text-teal", rejected: "bg-red-50 text-danger" };

export default function ReferralsPanel() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("pending");
  const [view, setView] = useState("rewards"); // rewards | referrers | settings
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [bonus, setBonus] = useState(null); // { userId, name, amount, note }
  const [q, setQ] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await apiFetch(`/api/admin/referrals?status=${tab}`, undefined, "GET");
      setData(res);
      setForm((f) => f || {
        ...res.settings,
        reward_rupees: Number(res.settings.reward_amount || 0) / 100
      });
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function post(body, id) {
    setBusyId(id || "x");
    try { await apiFetch("/api/admin/referrals", body, "POST"); await load(); return true; }
    catch (e) { alert(e.message); return false; }
    finally { setBusyId(null); }
  }

  async function saveSettings() {
    setSaving(true); setErr("");
    try {
      await apiFetch("/api/admin/referrals", { action: "settings", settings: form }, "POST");
      setSaved(true); setTimeout(() => setSaved(false), 2500);
      await load();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  if (!data && !err) return <div className="flex min-h-[50vh] items-center justify-center text-inkmuted">Loading…</div>;

  const s = data?.stats;
  const preview = form ? previewOffer(form) : "";
  const referrers = (data?.referrers || []).filter((r) => {
    const x = q.toLowerCase().trim();
    return !x || [r.name, r.username, r.code].some((v) => (v || "").toLowerCase().includes(x));
  });

  return (
    <section className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Refer &amp; Earn</h2>
          <p className="mt-0.5 text-sm text-inkmuted">Control the referral programme, approve rewards and see who&apos;s bringing in creators.</p>
        </div>
        {form && (
          <span className={`pill ${form.enabled ? "bg-teal-soft text-teal" : "bg-red-50 text-danger"}`}>
            Programme {data?.settings?.enabled ? "ON" : "OFF"}
          </span>
        )}
      </div>

      {err && <div className="mt-4 rounded-[8px] border border-danger/30 bg-red-50 p-4 text-sm text-danger">{err}</div>}
      {data?.warning && <div className="mt-4 rounded-[8px] border border-[#F5D48A] bg-[#FEF3C7] p-4 text-sm text-[#92600A]">{data.warning}</div>}

      {s && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Referred creators" value={s.referredCreators} />
          <Stat label="Active referrers" value={s.activeReferrers} />
          <Stat label="Awaiting approval" value={s.pendingCount} tone={s.pendingCount ? "warn" : ""} />
          <Stat label="Pending amount" value={inr(s.pending)} />
          <Stat label="Approved (lifetime)" value={inr(s.approved)} />
        </div>
      )}

      <div className="mt-6 flex gap-6 border-b border-line">
        {[["rewards", "Rewards"], ["referrers", "Referrers"], ["settings", "Programme settings"]].map(([id, l]) => (
          <button key={id} onClick={() => setView(id)}
            className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold ${view === id ? "border-ink text-ink" : "border-transparent text-inkmuted hover:text-ink"}`}>{l}</button>
        ))}
      </div>

      {/* ---------------- Rewards queue ---------------- */}
      {view === "rewards" && (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {STATUS_TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold capitalize ${tab === t ? "border-ink bg-ink text-white" : "border-line bg-white text-inkmuted hover:text-ink"}`}>{t}</button>
            ))}
          </div>
          <div className="card mt-4 overflow-x-auto">
            <div className="grid min-w-[860px] grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
              <div className="col-span-3">Referrer</div><div className="col-span-3">Referred creator</div><div className="col-span-2">Reason</div>
              <div className="col-span-1 text-right">Amount</div><div className="col-span-1 text-center">Status</div><div className="col-span-2 text-right">Action</div>
            </div>
            {(data?.rewards || []).length === 0 && <div className="px-5 py-14 text-center text-sm text-inkmuted">No {tab === "all" ? "" : tab} rewards.</div>}
            {(data?.rewards || []).map((r) => (
              <div key={r.id} className="grid min-w-[860px] grid-cols-12 items-center gap-4 border-b border-line px-5 py-3 text-sm last:border-0">
                <div className="col-span-3 min-w-0">
                  <div className="truncate font-semibold">{r.referrer.name}</div>
                  <div className="text-xs text-inkmuted">{new Date(r.created_at).toLocaleString("en-IN")}</div>
                </div>
                <div className="col-span-3 min-w-0 truncate">{r.referred ? r.referred.name : <span className="text-inkmuted">—</span>}</div>
                <div className="col-span-2 min-w-0">
                  <div className="truncate text-xs">{r.source === "manual" ? "Manual bonus" : r.source === "signup" ? "Signed up" : "Bought Pro"}</div>
                  {r.note && r.source === "manual" && <div className="truncate text-xs text-inkmuted">{r.note}</div>}
                </div>
                <div className="col-span-1 text-right font-semibold">{inr(r.amount)}</div>
                <div className="col-span-1 text-center"><span className={`pill capitalize ${ST[r.status]}`}>{r.status}</span></div>
                <div className="col-span-2 flex flex-wrap justify-end gap-2">
                  {r.status !== "approved" && (
                    <button onClick={() => post({ action: "review", id: r.id, status: "approved" }, r.id)} disabled={busyId === r.id} className="btn-brand px-3 py-1.5 text-xs">Approve</button>
                  )}
                  {r.status !== "rejected" && (
                    <button onClick={() => {
                      if (r.status === "approved" && !confirm("This reward is already in the creator's withdrawable balance. Reject it anyway?")) return;
                      post({ action: "review", id: r.id, status: "rejected" }, r.id);
                    }} disabled={busyId === r.id} className="btn-ghost px-3 py-1.5 text-xs text-danger">Reject</button>
                  )}
                  {r.status === "rejected" && (
                    <button onClick={() => confirm("Delete this reward record?") && post({ action: "delete", id: r.id }, r.id)} disabled={busyId === r.id} className="text-xs font-semibold text-inkmuted hover:text-danger">Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-inkmuted">Approved rewards are added to the creator&apos;s withdrawable balance and paid out through Payouts.</p>
        </>
      )}

      {/* ---------------- Referrers ---------------- */}
      {view === "referrers" && (
        <>
          <div className="mt-5 flex justify-end">
            <input className="input max-w-xs" placeholder="Search name, @user, code…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="card mt-4 overflow-x-auto">
            <div className="grid min-w-[860px] grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
              <div className="col-span-3">Creator</div><div className="col-span-1">Code</div><div className="col-span-1 text-right">Referred</div>
              <div className="col-span-1 text-right">Pro</div><div className="col-span-2 text-right">Approved</div><div className="col-span-1 text-right">Pending</div>
              <div className="col-span-3 text-right">Action</div>
            </div>
            {referrers.length === 0 && <div className="px-5 py-14 text-center text-sm text-inkmuted">No referrers yet.</div>}
            {referrers.map((r) => (
              <div key={r.userId} className="grid min-w-[860px] grid-cols-12 items-center gap-4 border-b border-line px-5 py-3 text-sm last:border-0">
                <div className="col-span-3 min-w-0">
                  <div className="truncate font-semibold">{r.name} {r.disabled && <span className="pill ml-1 bg-red-50 text-danger">disabled</span>}</div>
                  {r.username && <div className="truncate text-xs text-inkmuted">@{r.username}</div>}
                </div>
                <div className="col-span-1 font-mono text-xs">{r.code || "—"}</div>
                <div className="col-span-1 text-right tabular-nums">{r.referred}</div>
                <div className="col-span-1 text-right tabular-nums">{r.pro}</div>
                <div className="col-span-2 text-right font-semibold">{inr(r.approved)}</div>
                <div className="col-span-1 text-right">{inr(r.pending)}</div>
                <div className="col-span-3 flex flex-wrap justify-end gap-2">
                  <button onClick={() => setBonus({ userId: r.userId, name: r.name, amount: "", note: "" })} className="btn-ghost px-3 py-1.5 text-xs">+ Bonus</button>
                  <button onClick={() => post({ action: "creator", userId: r.userId, disabled: !r.disabled }, r.userId)} disabled={busyId === r.userId}
                    className={`btn-ghost px-3 py-1.5 text-xs ${r.disabled ? "" : "text-danger"}`}>{r.disabled ? "Re-enable" : "Disable referrals"}</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---------------- Settings ---------------- */}
      {view === "settings" && form && (
        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          <div className="card space-y-5 p-6 lg:col-span-2">
            <label className="flex items-center justify-between gap-4 rounded-xl border border-line bg-paper px-4 py-3">
              <div>
                <div className="font-semibold">Programme enabled</div>
                <div className="text-xs text-inkmuted">Off = the Refer &amp; Earn page shows a &ldquo;paused&rdquo; notice and no new rewards are created.</div>
              </div>
              <input type="checkbox" className="h-5 w-5 accent-brand" checked={!!form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            </label>

            <div>
              <label className="label">Reward is earned when…</label>
              <select className="input" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value, reward_type: e.target.value === "signup" ? "flat" : form.reward_type })}>
                {TRIGGERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Reward type</label>
                <select className="input" value={form.reward_type} onChange={(e) => setForm({ ...form, reward_type: e.target.value })}>
                  <option value="flat">Flat amount (₹)</option>
                  <option value="percent" disabled={form.trigger === "signup"}>% of the Pro payment</option>
                </select>
              </div>
              {form.reward_type === "flat" ? (
                <div><label className="label">Amount (₹)</label>
                  <input className="input" type="number" min="0" value={form.reward_rupees} onChange={(e) => setForm({ ...form, reward_rupees: e.target.value })} /></div>
              ) : (
                <div><label className="label">Percentage (%)</label>
                  <input className="input" type="number" min="0" max="100" value={form.reward_percent} onChange={(e) => setForm({ ...form, reward_percent: e.target.value })} /></div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Max rewards per creator</label>
                <input className="input" type="number" min="0" value={form.max_rewards_per_user} onChange={(e) => setForm({ ...form, max_rewards_per_user: e.target.value })} />
                <p className="mt-1 text-xs text-inkmuted">0 = unlimited. Manual bonuses don&apos;t count.</p>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-line px-4 py-3">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={!!form.auto_approve} onChange={(e) => setForm({ ...form, auto_approve: e.target.checked })} />
                <span>
                  <span className="block text-sm font-semibold">Auto-approve rewards</span>
                  <span className="block text-xs text-inkmuted">Off = each reward waits in the queue for you to approve.</span>
                </span>
              </label>
            </div>

            <div><label className="label">Headline shown to creators</label>
              <input className="input" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></div>
            <div><label className="label">Terms &amp; conditions (optional)</label>
              <textarea className="input min-h-[100px]" value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })}
                placeholder="e.g. Rewards are paid after the referred creator's 7-day refund window…" /></div>

            <div className="flex items-center justify-end gap-3">
              {saved && <span className="text-sm font-semibold text-teal">Saved ✓</span>}
              <button onClick={saveSettings} disabled={saving} className="btn-brand">{saving ? "Saving…" : "Save settings"}</button>
            </div>
          </div>

          <div className="card h-fit p-6">
            <div className="text-xs font-bold uppercase tracking-wide text-inkmuted">Creators will see</div>
            <div className="mt-3 rounded-xl bg-paper p-4">
              <div className="font-display text-lg font-bold">{form.headline || "Invite creators, earn rewards"}</div>
              <p className="mt-1 text-sm text-inkmuted">{form.enabled ? `Earn ${preview}.` : "The referral programme is paused right now."}</p>
            </div>
          </div>
        </div>
      )}

      {bonus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setBonus(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold">Bonus for {bonus.name}</h3>
            <p className="mt-0.5 text-xs text-inkmuted">Added as an approved reward — it&apos;s withdrawable right away.</p>
            <label className="label mt-4">Amount (₹)</label>
            <input className="input" type="number" min="1" autoFocus value={bonus.amount} onChange={(e) => setBonus({ ...bonus, amount: e.target.value })} />
            <label className="label mt-3">Note</label>
            <input className="input" placeholder="e.g. Top referrer — October" value={bonus.note} onChange={(e) => setBonus({ ...bonus, note: e.target.value })} />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setBonus(null)} className="btn-ghost">Cancel</button>
              <button disabled={busyId === "bonus"} className="btn-brand"
                onClick={async () => { if (await post({ action: "manual", userId: bonus.userId, amount: Number(bonus.amount), note: bonus.note }, "bonus")) setBonus(null); }}>
                Add bonus
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function previewOffer(f) {
  const amt = f.reward_type === "percent" ? `${Number(f.reward_percent) || 0}% of their Pro payment` : `₹${Number(f.reward_rupees || 0).toLocaleString("en-IN")}`;
  const when = f.trigger === "signup" ? "for every creator who signs up with your link"
    : f.trigger === "every_pro" ? "every time a creator you referred pays for Pro"
    : "when a creator you referred buys Pro for the first time";
  return `${amt} ${when}`;
}

function Stat({ label, value, tone }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${tone === "warn" ? "border-[#F5D48A] bg-[#FEF3C7]" : "border-line bg-paper"}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-inkmuted">{label}</div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
    </div>
  );
}
