"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { heroSurface, SHEEN } from "@/lib/texture";

export default function Refer() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase.from("mp_profiles").select("referral_code").eq("user_id", user.id).maybeSingle();
      const c = prof?.referral_code || "";
      setCode(c);
      if (c) {
        const { count: n } = await supabase.from("mp_profiles").select("user_id", { count: "exact", head: true }).eq("referred_by", c);
        setCount(n || 0);
      }
    })();
  }, [user]);

  const link = typeof window !== "undefined" && code ? `${window.location.origin}/?ref=${code}` : "";

  return (
    <main>
      <section className="relative overflow-hidden px-8 pb-12 pt-8 text-white" style={heroSurface()}>
        <div className="pointer-events-none absolute inset-0" style={SHEEN} />
        <div className="relative">
          <h1 className="font-display text-4xl font-bold drop-shadow-sm">Refer & Earn</h1>
          <p className="mt-1 text-sm text-white/75">Invite other creators to SuperCreators and grow together.</p>
        </div>
      </section>
      <section className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2">
            <div className="text-xs font-bold uppercase tracking-wide text-inkmuted">Your referral link</div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="min-w-0 flex-1 truncate rounded-[10px] bg-paper px-4 py-3 text-sm">{link || "Loading…"}</code>
              <button onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="btn-brand" disabled={!link}>{copied ? "Copied ✓" : "Copy link"}</button>
            </div>
            <p className="mt-3 text-sm text-inkmuted">Share this on your socials. Anyone who signs up through it is tracked to your account.</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-card p-5" style={{ background: "#DBEAFE" }}><div className="text-xs font-semibold text-ink/60">Creators referred</div><div className="mt-0.5 font-display text-3xl font-bold">{count}</div></div>
            <div className="rounded-card p-5" style={{ background: "#FEF3C7" }}><div className="text-xs font-semibold text-ink/60">Earnings (lifetime)</div><div className="mt-0.5 font-display text-3xl font-bold">₹0</div></div>
          </div>
        </div>
        <div className="card mt-6 p-6">
          <h2 className="font-display text-lg font-bold">How it works</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            {[["1", "Share your link", "Post your referral link anywhere — bio, stories, WhatsApp."], ["2", "They sign up", "New creators join SuperCreators through your link."], ["3", "You both grow", "Track your referrals here as your network expands."]].map(([n, t, d]) => (
              <div key={n} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">{n}</span>
                <div><div className="font-semibold">{t}</div><p className="mt-0.5 text-sm text-inkmuted">{d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
