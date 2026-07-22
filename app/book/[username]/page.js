"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { inr } from "@/lib/courseModel";
import { useAuth } from "@/components/AuthProvider";
import CheckoutModal from "@/components/CheckoutModal";
import VisitTracker from "@/components/VisitTracker";
import { heroSurface } from "@/lib/texture";
import { BuiltWithLink } from "@/components/Branding";
import { SocialIcon, socialLabel } from "@/components/BrandIcons";

export default function BookingPage() {
  const { username } = useParams();
  const r = useRouter();
  const path = usePathname();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [avail, setAvail] = useState(null);
  const [state, setState] = useState("loading");
  const [picked, setPicked] = useState(null);
  const [day, setDay] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [checkout, setCheckout] = useState(false);
  const [bookedOk, setBookedOk] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("mp_profiles").select("*").eq("username", username).maybeSingle();
      if (!p || p.blocked) { setState("missing"); return; }
      setProfile(p);
      const [{ data: s }, { data: a }] = await Promise.all([
        supabase.from("mp_sessions").select("*").eq("owner_id", p.user_id).eq("active", true).order("position"),
        supabase.from("mp_availability").select("*").eq("owner_id", p.user_id).maybeSingle()
      ]);
      setSessions(s || []); setAvail(a);
      setPicked((s || [])[0] || null);
      setState("ready");
    })();
  }, [username]);

  const days = useMemo(() => {
    const out = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() + i); d.setHours(0, 0, 0, 0);
      const conf = avail?.days?.[String(d.getDay())];
      out.push({ date: d, open: !!conf?.on });
    }
    return out;
  }, [avail]);

  // Auto-select the first open day when a session is picked.
  useEffect(() => {
    if (picked && !day) { const firstOpen = days.find((d) => d.open); if (firstOpen) setDay(firstOpen.date); }
  }, [picked, days, day]);

  useEffect(() => {
    if (!picked || !day || !avail || !profile) { setSlots([]); return; }
    (async () => {
      const from = new Date(day); const to = new Date(day); to.setDate(to.getDate() + 1);
      const { data: busy } = await supabase.rpc("mp_busy_slots", { p_owner: profile.user_id, p_from: from.toISOString(), p_to: to.toISOString() });
      const conf = avail.days[String(day.getDay())];
      const list = []; const now = new Date();
      for (const [start, end] of conf?.ranges || []) {
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        let t = new Date(day); t.setHours(sh, sm, 0, 0);
        const limit = new Date(day); limit.setHours(eh, em, 0, 0);
        while (t.getTime() + picked.duration_min * 60000 <= limit.getTime()) {
          const slotEnd = new Date(t.getTime() + picked.duration_min * 60000);
          const clash = (busy || []).some((b) => new Date(b.starts_at) < slotEnd && new Date(b.ends_at) > t);
          if (t > now && !clash) list.push(new Date(t));
          t = new Date(t.getTime() + picked.duration_min * 60000);
        }
      }
      setSlots(list); setSlot(null);
    })();
  }, [picked, day, avail, profile]);

  if (state === "loading") return <div className="flex min-h-screen items-center justify-center text-inkmuted">Loading…</div>;
  if (state === "missing") return <div className="flex min-h-screen items-center justify-center text-inkmuted">This booking page isn't available.</div>;

  function proceed() {
    if (!user) { r.push(`/login?next=${path}`); return; }
    setCheckout(true);
  }

  const s = profile.socials || {};

  return (
    <main className="min-h-screen bg-paper">
      <VisitTracker ownerId={profile.user_id} path={`/book/${username}`} source="booking" buyerPhone={user?.user_metadata?.phone} />
      <div className="h-1.5 w-full bg-brand" />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {bookedOk && (
          <div className="mb-6 rounded-card bg-teal p-4 text-center text-sm font-semibold text-white">
            ✅ Booking confirmed for {slot && new Date(slot).toLocaleString("en-IN", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. See you there!
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* LEFT — profile + sessions */}
          <div className="space-y-5">
            <div className="card overflow-hidden">
              <div className="relative overflow-hidden px-4 pb-5 pt-6 text-center text-white sm:px-6 sm:pb-6 sm:pt-8" style={heroSurface({ base: "#101114", tint: "#1B2A4A", accent: "#2E6EF7", warm: "#4F46E5" })}>
                <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-white/40 bg-white/10 text-2xl font-bold leading-[76px]">
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : (profile.display_name || username)[0]?.toUpperCase()}
                </div>
                <h1 className="mt-3 font-display text-xl font-bold">{profile.display_name || `@${username}`}</h1>
                {profile.business_name && <p className="text-sm text-white/70">{profile.business_name}</p>}
                {profile.bio && <p className="mt-1 text-sm text-white/70">{profile.bio}</p>}
                <div className="-mx-2 mt-3 flex justify-start gap-2 overflow-x-auto px-2 sm:justify-center sm:overflow-visible">
                  {Object.entries(s).filter(([, v]) => v).map(([k, v]) => (
                    <a key={k} href={v} target="_blank" aria-label={socialLabel(k)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 py-1 pl-1.5 pr-3 text-xs font-semibold hover:bg-white/25">
                      <SocialIcon name={k} size={18} className="rounded" />
                      {socialLabel(k)}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-inkmuted">Choose a session</h2>

              {sessions.length === 0 && <div className="card p-6 text-center text-sm text-inkmuted">No sessions available right now.</div>}

              {/* Phones: a native dropdown — one tap, no scrolling through
                  cards, and the OS renders its own picker UI. */}
              {sessions.length > 0 && (
                <div className="lg:hidden">
                  <select
                    className="input w-full appearance-none bg-white py-3 font-semibold"
                    value={picked?.id || ""}
                    onChange={(e) => {
                      const sess = sessions.find((x) => x.id === e.target.value);
                      if (sess) { setPicked(sess); setDay(null); setSlot(null); setBookedOk(false); }
                    }}
                  >
                    {sessions.map((sess) => (
                      <option key={sess.id} value={sess.id}>
                        {sess.title} — {sess.duration_min} min · {sess.price ? inr(sess.price) : "Free"}
                      </option>
                    ))}
                  </select>
                  {picked?.description && <p className="mt-2 text-sm text-inkmuted">{picked.description}</p>}
                </div>
              )}

              {/* Desktop: the full cards */}
              <div className="hidden space-y-2 lg:block">
                {sessions.map((sess) => (
                  <button key={sess.id} onClick={() => { setPicked(sess); setDay(null); setSlot(null); setBookedOk(false); }}
                    className={`card w-full p-4 text-left transition-all ${picked?.id === sess.id ? "border-brand ring-2 ring-brand/20" : "hover:-translate-y-0.5"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-display text-base font-bold">{sess.title}</div>
                      <div className="shrink-0 text-sm font-semibold">{sess.price ? inr(sess.price) : "Free"}</div>
                    </div>
                    <div className="mt-0.5 text-xs text-inkmuted">{sess.duration_min} min{sess.description ? ` · ${sess.description}` : ""}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — everything at once: day + time + summary */}
          <div className="card p-4 sm:p-6">
            {!picked ? (
              <div className="flex h-full min-h-[300px] items-center justify-center text-center text-sm text-inkmuted">Select a session to see availability.</div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
                  <div>
                    <div className="font-display text-lg font-bold">{picked.title}</div>
                    <div className="text-sm text-inkmuted">{picked.duration_min} min · {picked.price ? inr(picked.price) : "Free"} {avail?.timezone && `· ${avail.timezone}`}</div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-sm font-bold uppercase tracking-wide text-inkmuted">Pick a day</div>
                  {/* 7-column wrapping grid (2 week rows): fits every screen
                      width with no horizontal scrolling anywhere. */}
                  <div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2">
                    {days.map(({ date, open }) => (
                      <button key={date.toISOString()} disabled={!open}
                        onClick={() => { setDay(date); setBookedOk(false); }}
                        className={`rounded-lg border py-2 text-center transition-colors sm:rounded-xl sm:py-2.5 ${day?.getTime() === date.getTime() ? "border-brand bg-brand text-white" : open ? "border-line bg-white hover:border-brand" : "border-line bg-paper text-inkmuted opacity-50"}`}>
                        <div className="text-[10px] font-semibold uppercase sm:text-[11px]">{date.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2)}</div>
                        <div className="font-display text-base font-bold sm:text-lg">{date.getDate()}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {day && (
                  <div className="mt-5">
                    <div className="text-sm font-bold uppercase tracking-wide text-inkmuted">Pick a time</div>
                    <div className="mt-3 grid max-h-60 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                      {slots.length === 0 && <p className="col-span-full text-sm text-inkmuted">No free slots this day — try another.</p>}
                      {slots.map((t) => (
                        <button key={t.toISOString()} onClick={() => setSlot(t.toISOString())}
                          className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition-colors ${slot === t.toISOString() ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand"}`}>
                          {t.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sticks flush to the bottom edge on phones so Confirm is
                    always in reach; normal flow on desktop. -mx/-mb cancel the
                    card padding so it truly touches the screen edge. */}
                <div className="sticky bottom-0 z-10 -mx-4 mt-6 rounded-t-xl border-t border-line bg-paper p-4 shadow-[0_-6px_16px_rgba(16,17,20,0.08)] sm:static sm:mx-0 sm:rounded-xl sm:border-0 sm:shadow-none">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-inkmuted">Session</span><span className="font-semibold">{picked.title}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-inkmuted">When</span>
                    <span className="font-semibold">{slot ? new Date(slot).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Pick a slot"}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-inkmuted">Price</span><span className="font-semibold">{picked.price ? inr(picked.price) : "Free"}</span>
                  </div>
                  <button onClick={proceed} disabled={!slot} className="btn-brand mt-4 w-full py-3 disabled:opacity-50">
                    {picked.price ? `Book & pay ${inr(picked.price)}` : "Confirm free booking"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="mt-10 text-center"><BuiltWithLink light={false} /></div>
      </div>

      {checkout && user && slot && (
        <CheckoutModal productType="booking" productId={picked.id}
          title={`${picked.title} · ${new Date(slot).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
          price={{ isFree: !picked.price, label: inr(picked.price) }} meta={{ startsAt: slot }} user={user}
          onClose={() => setCheckout(false)}
          onSuccess={() => { setCheckout(false); setBookedOk(true); window.scrollTo(0, 0); }} />
      )}
    </main>
  );
}