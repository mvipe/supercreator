"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ytEmbed } from "@/lib/courseModel";
import { heroSurface } from "@/lib/texture";

export default function Learn() {
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    supabase.from("mp_tutorials").select("*").eq("published", true).order("position").order("created_at")
      .then(({ data }) => { setTutorials(data || []); setLoading(false); });
  }, []);

  // Group by category, preserving order.
  const groups = tutorials.reduce((acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {});

  return (
    <main>
      <section className="relative overflow-hidden px-8 py-16 text-center text-white"
        style={heroSurface({ base: "#101114", tint: "#16233F", accent: "#2E6EF7", warm: "#4F46E5" })}>
        <p className="text-sm font-semibold uppercase tracking-widest text-white/60">🎓 Creator Academy</p>
        <h1 className="mx-auto mt-3 max-w-2xl font-display text-4xl font-bold leading-tight sm:text-5xl">Learn how to grow and sell with SuperCreators</h1>
      </section>

      <section className="px-4 py-6 sm:px-8 sm:py-10">
        {loading && <p className="text-sm text-inkmuted">Loading tutorials…</p>}
        {!loading && tutorials.length === 0 && (
          <div className="card px-6 py-16 text-center">
            <p className="font-display text-lg font-bold">Tutorials coming soon</p>
            <p className="mt-1 text-sm text-inkmuted">New lessons are added regularly — check back shortly.</p>
          </div>
        )}
        {Object.entries(groups).map(([category, items]) => (
          <div key={category} className="mb-10">
            <h2 className="font-display text-2xl font-bold">{category}</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => (
                <button key={t.id} onClick={() => setActive(t)} className="card overflow-hidden text-left transition-transform hover:-translate-y-0.5">
                  <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-brand to-brand-dark text-white">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-base font-bold leading-snug">{t.title}</h3>
                    {t.description && <p className="mt-1 line-clamp-2 text-sm text-inkmuted">{t.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setActive(null)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video bg-black">
              {ytEmbed(active.video_url)
                ? <iframe src={ytEmbed(active.video_url)} className="h-full w-full" allowFullScreen title={active.title} />
                : <video src={active.video_url} controls className="h-full w-full" />}
            </div>
            <div className="flex items-start justify-between gap-4 p-5">
              <div>
                <h3 className="font-display text-lg font-bold">{active.title}</h3>
                {active.description && <p className="mt-1 text-sm text-inkmuted">{active.description}</p>}
              </div>
              <button onClick={() => setActive(null)} className="btn-ghost shrink-0">Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
