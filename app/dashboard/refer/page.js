"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { heroSurface, SHEEN } from "@/lib/texture";
import { inr } from "@/lib/courseModel";

// Refer & Earn — the offer, reward rules and on/off switch all come from the
// admin panel (Admin → Refer & Earn) via /api/referrals.
const ST = { pending: "bg-[#FEF3C7] text-[#92600A]", approved: "bg-teal-soft text-teal", rejected: "bg-red-50 text-danger" };

export default function Refer() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/referrals", undefined, "GET").then(setD).catch((e) => setErr(e.message));
  }, [user]);

  const link = typeof window !== "undefined" && d?.code ? `${window.location.origin}/?ref=${d.code}` : "";
  const p = d?.program;
  const active = p?.enabled && !d?.blocked;

  function copy() {
    navigator.clipboard?.writeText(link);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  const share = () => {
    const text = `I sell my courses & digital products on SuperCreators — join with my link: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  return (
    <main>
      <section className="relative overflow-hidden px-8 pb-12 pt-8 text-white" style={heroSurface()}>
        <div className="pointer-events-none absolute inset-0" style={SHEEN} />
        <div className="relative">
          <h1 className="font-display text-4xl font-bold drop-shadow-sm">Refer &amp; Earn</h1>
          <p className="mt-1 text-sm text-white/75">{p?.headline || "Invite other creators to SuperCreators and grow together."}</p>
        </div>
      </section>
      <section className="px-4 py-6 sm:px-8 sm:py-8">
        {err && <div className="mb-4 rounded-[8px] bg-red-50 p-4 text-sm text-danger">{err}</div>}
        {!d && !err && <div className="py-16 text-center text-sm text-inkmuted">Loading…</div>}

        {d && !active && (
          <div className="mb-6 rounded-card border border-[#F5D48A] bg-[#FEF3C7] p-5 text-sm text-[#92600A]">
            {d.blocked
              ? "Referral rewards are turned off for your account. Contact support if you think this is a mistake."
              : "The referral programme is paused right now. Your past referrals and earnings are safe — new rewards will start again when it's back."}
          </div>
        )}

        {d && (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="card p-6 lg:col-span-2">
                {active && (
                  <div className="mb-5 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">
                    🎁 Earn <b>{p.offer}</b>.{!p.autoApprove && " Rewards are credited after a quick review."}
                  </div>
                )}
                <div className="text-xs font-bold uppercase tracking-wide text-inkmuted">Your referral link</div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <code className="min-w-0 flex-1 truncate rounded-[10px] bg-paper px-4 py-3 text-sm">{link || "—"}</code>
                  <button onClick={copy} className="btn-brand" disabled={!link}>{copied ? "Copied ✓" : "Copy link"}</button>
                  <button onClick={share} className="btn-ghost" disabled={!link}>Share on WhatsApp</button>
                </div>
                <p className="mt-3 text-sm text-inkmuted">Code: <b className="font-mono text-ink">{d.code || "—"}</b> · anyone who signs up through your link is tracked to your account.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                <Tile bg="#DBEAFE" label="Creators referred" value={d.totals.referred} sub={`${d.totals.pro} on Pro`} />
                <Tile bg="#D1FAE5" label="Earned (approved)" value={inr(d.totals.approved)} sub="Withdraw from Payouts" />
                <Tile bg="#FEF3C7" label="Pending review" value={inr(d.totals.pending)} />
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="card p-6">
                <h2 className="font-display text-lg font-bold">Your rewards</h2>
                {d.rewards.length === 0 ? <p className="mt-3 text-sm text-inkmuted">No rewards yet.</p> : (
                  <div className="mt-3 divide-y divide-line">
                    {d.rewards.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className="min-w-0 flex-1 truncate">{r.source === "manual" ? (r.note || "Bonus") : r.source === "signup" ? "Creator signed up" : "Creator bought Pro"}</span>
                        <span className="shrink-0 text-xs text-inkmuted">{new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                        <span className={`pill shrink-0 capitalize ${ST[r.status]}`}>{r.status}</span>
                        <span className="w-20 shrink-0 text-right font-semibold">{inr(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card p-6">
                <h2 className="font-display text-lg font-bold">Creators you referred</h2>
                {d.referred.length === 0 ? <p className="mt-3 text-sm text-inkmuted">Nobody yet — share your link to get started.</p> : (
                  <div className="mt-3 max-h-80 divide-y divide-line overflow-y-auto">
                    {d.referred.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                        {r.isPro && <span className="pill bg-teal-soft text-teal">Pro</span>}
                        <span className="shrink-0 text-xs text-inkmuted">{new Date(r.joinedAt).toLocaleDateString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card mt-6 p-6">
              <h2 className="font-display text-lg font-bold">How it works</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-3">
                {[
                  ["1", "Share your link", "Post your referral link anywhere — bio, stories, WhatsApp."],
                  ["2", "They join", p?.trigger === "signup" ? "A new creator signs up through your link." : "A new creator signs up through your link and upgrades to Pro."],
                  ["3", "You earn", active ? `You get ${p.offer.replace(/ (for|when|every time).*/, "")}, withdrawable from Payouts.` : "Rewards resume when the programme is back on."]
                ].map(([n, t, desc]) => (
                  <div key={n} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">{n}</span>
                    <div><div className="font-semibold">{t}</div><p className="mt-0.5 text-sm text-inkmuted">{desc}</p></div>
                  </div>
                ))}
              </div>
              {p?.terms && <p className="mt-5 whitespace-pre-wrap border-t border-line pt-4 text-xs text-inkmuted">{p.terms}</p>}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Tile({ bg, label, value, sub }) {
  return (
    <div className="rounded-card p-5" style={{ background: bg }}>
      <div className="text-xs font-semibold text-ink/60">{label}</div>
      <div className="mt-0.5 font-display text-3xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink/50">{sub}</div>}
    </div>
  );
}
