"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { inr } from "@/lib/courseModel";
import { Field, Switch } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";

const TABS = ["Bookings", "Sessions", "Responses", "Settings"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Bookings() {
  const { user } = useAuth();
  const [tab, setTab] = useState("Bookings");
  const [sessions, setSessions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [avail, setAvail] = useState(null);
  const [profile, setProfile] = useState(null);
  const [dirtyAvail, setDirtyAvail] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null); // session pending delete
  const [busyId, setBusyId] = useState(null);
  const [sessionMsg, setSessionMsg] = useState("");

  async function copyLink(url) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
      }
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { window.prompt("Copy this link:", url); }
  }

  async function load() {
    const [{ data: s }, { data: b }, { data: a }, { data: p }] = await Promise.all([
      supabase.from("mp_sessions").select("*").eq("owner_id", user.id).order("position"),
      supabase.from("mp_bookings").select("*").eq("owner_id", user.id).order("starts_at", { ascending: false }),
      supabase.from("mp_availability").select("*").eq("owner_id", user.id).maybeSingle(),
      supabase.from("mp_profiles").select("username").eq("user_id", user.id).maybeSingle()
    ]);
    setSessions(s || []); setBookings(b || []); setProfile(p);
    setAvail(a || { owner_id: user.id, timezone: "Asia/Kolkata", days: Object.fromEntries([0,1,2,3,4,5,6].map(i => [String(i), { on: i >= 1 && i <= 5, ranges: [["09:00", "17:00"]] }])) });
  }
  useEffect(() => { if (user) load(); }, [user]);

  const stats = useMemo(() => {
    const upcoming = bookings.filter((b) => new Date(b.starts_at) > new Date() && b.status === "confirmed");
    const earned = bookings.reduce((a, b) => a + (b.amount || 0), 0) / 100;
    return { total: bookings.length, earned, upcoming: upcoming.length };
  }, [bookings]);

  const bookingUrl = profile?.username ? `/book/${profile.username}` : null;

  async function addSession() {
    const { error } = await supabase.from("mp_sessions").insert({
      owner_id: user.id, title: "New session", duration_min: 30, price: 0, description: "", position: sessions.length
    });
    if (error) alert(error.message); else load();
  }
  async function updateSession(id, p) {
    setSessions(sessions.map((s) => s.id === id ? { ...s, ...p } : s));
    await supabase.from("mp_sessions").update(p).eq("id", id);
  }
  /** How many bookings would be removed along with this session. */
  function bookingsFor(id) {
    return bookings.filter((b) => b.session_id === id).length;
  }

  async function removeSession(id) {
    setBusyId(id); setSessionMsg("");
    try {
      // .select() so we can tell "deleted 0 rows" (RLS blocked it) apart from
      // a real success — the old code ignored the result entirely and just
      // reloaded, so a failed delete looked like nothing happened at all.
      const { data, error } = await supabase.from("mp_sessions").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("This session couldn't be deleted. Run supabase/fix-pack.sql to add the delete policy, then try again.");
      }
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setConfirmDel(null);
      setSessionMsg("Session deleted ✓");
      setTimeout(() => setSessionMsg(""), 2500);
      load();
    } catch (e) {
      setSessionMsg(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function duplicateSession(s) {
    setBusyId(s.id); setSessionMsg("");
    try {
      const { error } = await supabase.from("mp_sessions").insert({
        owner_id: user.id, title: `${s.title} (copy)`, description: s.description || "",
        duration_min: s.duration_min, price: s.price, active: false, position: sessions.length
      });
      if (error) throw error;
      load();
    } catch (e) { setSessionMsg(e.message); }
    finally { setBusyId(null); }
  }
  async function saveAvail() {
    const { error } = await supabase.from("mp_availability").upsert(avail);
    if (error) alert(error.message); else setDirtyAvail(false);
  }
  async function setBookingStatus(id, status) {
    await supabase.from("mp_bookings").update({ status }).eq("id", id);
    load();
  }

  return (
    <main>
      <div className="border-b border-line bg-white px-8">
        <nav className="flex gap-7 pt-4">
          {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`tab ${tab === t ? "active" : ""}`}>{t}</button>)}
        </nav>
      </div>

      <div className="grid gap-6 px-8 py-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {/* ---------- Bookings ---------- */}
          {tab === "Bookings" && (
            <div className="card overflow-x-auto">
              <div className="grid min-w-[720px] grid-cols-12 gap-3 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
                <div className="col-span-3">When</div><div className="col-span-3">Session</div>
                <div className="col-span-2">Buyer</div><div className="col-span-1 text-right">Amount</div><div className="col-span-3">Status</div>
              </div>
              {bookings.length === 0 && (
                <div className="px-5 py-16 text-center">
                  <p className="font-display text-lg font-bold">No upcoming bookings</p>
                  <p className="mt-1 text-sm text-inkmuted">Your schedule looks empty. Share your booking page to get bookings.</p>
                </div>
              )}
              {bookings.map((b) => {
                const s = sessions.find((x) => x.id === b.session_id);
                return (
                  <div key={b.id} className="grid min-w-[720px] grid-cols-12 items-center gap-3 border-b border-line px-5 py-3.5 text-sm last:border-0">
                    <div className="col-span-3 whitespace-nowrap">{new Date(b.starts_at).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="col-span-3 truncate font-semibold">{s?.title || "Session"}</div>
                    <div className="col-span-2 truncate">+{b.buyer_phone || "—"}</div>
                    <div className="col-span-1 whitespace-nowrap text-right font-semibold">{inr((b.amount || 0) / 100)}</div>
                    <div className="col-span-3 flex items-center gap-2">
                      <span className={`pill shrink-0 ${b.status === "confirmed" ? "bg-brand-soft text-brand" : b.status === "completed" ? "bg-teal-soft text-teal" : "bg-paper text-inkmuted"}`}>{b.status}</span>
                      {b.status === "confirmed" && (
                        <button onClick={() => setBookingStatus(b.id, "completed")} className="shrink-0 text-xs font-semibold text-teal hover:underline">Mark done</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ---------- Sessions ---------- */}
          {tab === "Sessions" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={addSession} className="btn-ghost">+ New session</button>
                {sessionMsg && (
                  <span className={`text-sm font-semibold ${sessionMsg.includes("✓") ? "text-teal" : "text-danger"}`}>{sessionMsg}</span>
                )}
              </div>
              {sessions.map((s) => (
                <div key={s.id} className="card p-4">
                  <div className="flex items-center gap-3">
                    <input className="input font-semibold" value={s.title} onChange={(e) => updateSession(s.id, { title: e.target.value })} />
                    <label className="flex shrink-0 items-center gap-2 text-xs font-semibold">
                      Active <Switch on={s.active} onChange={(v) => updateSession(s.id, { active: v })} />
                    </label>
                    <button
                      onClick={() => duplicateSession(s)}
                      disabled={busyId === s.id}
                      title="Duplicate session"
                      className="shrink-0 rounded-[8px] border border-line px-2.5 py-1.5 text-xs font-semibold text-inkmuted hover:text-ink disabled:opacity-50">
                      Duplicate
                    </button>
                    <button
                      onClick={() => setConfirmDel(s)}
                      disabled={busyId === s.id}
                      title="Delete session"
                      className="shrink-0 rounded-[8px] border border-danger/30 px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-red-50 disabled:opacity-50">
                      {busyId === s.id ? "…" : "Delete"}
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="Duration (minutes)">
                      <select className="input" value={s.duration_min} onChange={(e) => updateSession(s.id, { duration_min: Number(e.target.value) })}>
                        {[15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}
                      </select>
                    </Field>
                    <Field label="Price (₹, 0 = free)">
                      <input className="input" type="number" min="0" value={s.price} onChange={(e) => updateSession(s.id, { price: Number(e.target.value) })} />
                    </Field>
                  </div>
                  <div className="mt-3">
                    <Field label="Description">
                      <textarea className="input min-h-[60px]" value={s.description} onChange={(e) => updateSession(s.id, { description: e.target.value })} />
                    </Field>
                  </div>
                  {bookingsFor(s.id) > 0 && (
                    <p className="mt-3 text-xs text-inkmuted">
                      {bookingsFor(s.id)} booking{bookingsFor(s.id) === 1 ? "" : "s"} attached to this session.
                    </p>
                  )}
                </div>
              ))}
              {sessions.length === 0 && <p className="text-sm text-inkmuted">No sessions yet — add your first offering (e.g. "Discovery Call · 15 min · Free").</p>}
            </div>
          )}

          {/* ---------- Responses ---------- */}
          {tab === "Responses" && (
            <div className="card">
              {bookings.filter((b) => (b.answers || []).length).length === 0 && (
                <div className="px-5 py-16 text-center">
                  <p className="font-display text-lg font-bold">No responses yet</p>
                  <p className="mt-1 text-sm text-inkmuted">Answers buyers give at checkout will show up here.</p>
                </div>
              )}
              {bookings.filter((b) => (b.answers || []).length).map((b) => (
                <div key={b.id} className="border-b border-line px-5 py-4 text-sm last:border-0">
                  <div className="font-semibold">+{b.buyer_phone} · {new Date(b.starts_at).toLocaleString("en-IN")}</div>
                  <ul className="mt-1 space-y-0.5 text-inkmuted">
                    {b.answers.map((a, i) => <li key={i}><b className="text-ink">{a.label}:</b> {a.value}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* ---------- Settings / Availability ---------- */}
          {tab === "Settings" && avail && (
            <div className="space-y-5">
              <div className="card p-5">
                <h3 className="font-display text-lg font-bold">Your timezone</h3>
                <p className="mt-0.5 text-sm text-inkmuted">Slots on your booking page use this timezone.</p>
                <select className="input mt-3 max-w-sm" value={avail.timezone} onChange={(e) => { setAvail({ ...avail, timezone: e.target.value }); setDirtyAvail(true); }}>
                  {["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York"].map((z) => <option key={z}>{z}</option>)}
                </select>
              </div>
              <div className="card p-5">
                <h3 className="font-display text-lg font-bold">When are you available?</h3>
                <div className="mt-4 space-y-3">
                  {DAYS.map((name, i) => {
                    const day = avail.days[String(i)];
                    return (
                      <div key={i} className="flex flex-wrap items-center gap-3">
                        <Switch on={day.on} onChange={(v) => { setAvail({ ...avail, days: { ...avail.days, [String(i)]: { ...day, on: v } } }); setDirtyAvail(true); }} />
                        <span className="w-28 text-sm font-semibold">{name}</span>
                        {day.on && day.ranges.map((rg, ri) => (
                          <span key={ri} className="flex items-center gap-2">
                            <input type="time" className="input w-auto" value={rg[0]}
                              onChange={(e) => { const ranges = day.ranges.map((x, j) => j === ri ? [e.target.value, x[1]] : x); setAvail({ ...avail, days: { ...avail.days, [String(i)]: { ...day, ranges } } }); setDirtyAvail(true); }} />
                            –
                            <input type="time" className="input w-auto" value={rg[1]}
                              onChange={(e) => { const ranges = day.ranges.map((x, j) => j === ri ? [x[0], e.target.value] : x); setAvail({ ...avail, days: { ...avail.days, [String(i)]: { ...day, ranges } } }); setDirtyAvail(true); }} />
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <button onClick={saveAvail} disabled={!dirtyAvail} className="btn-ink mt-5">Save availability</button>
              </div>
            </div>
          )}
        </div>

        {/* Right rail */}
        <aside className="space-y-4">
          <div className="card p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-inkmuted">Your booking page</div>
            {bookingUrl ? (
              <>
                <a href={bookingUrl} target="_blank" className="mt-1 block truncate text-sm font-semibold text-brand hover:underline">SuperCreators.app{bookingUrl}</a>
                <button className="btn-ghost mt-3 w-full" onClick={() => copyLink(window.location.origin + bookingUrl)}>{copied ? "Copied ✓" : "Copy link"}</button>
              </>
            ) : (
              <p className="mt-1 text-sm text-inkmuted">Set your username in <a href="/dashboard/store" className="font-semibold text-brand">Store</a> to get your booking link.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total bookings" value={stats.total} bg="#DBEAFE" />
            <StatCard label="Amount earned" value={inr(stats.earned)} bg="#FEF3C7" />
            <StatCard label="Upcoming" value={stats.upcoming} bg="#E9D5FF" />
            <StatCard label="Sessions" value={sessions.length} bg="#FBCFE8" />
          </div>
        </aside>
      </div>

      {/* ---------- Delete session confirmation ---------- */}
      {confirmDel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDel(null)}>
          <div className="w-full max-w-md rounded-card bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold">Delete this session?</h3>
            <p className="mt-2 text-sm text-inkmuted">
              <b className="text-ink">{confirmDel.title || "Untitled session"}</b> ({confirmDel.duration_min} min
              {confirmDel.price > 0 ? ` · ${inr(confirmDel.price)}` : " · Free"}) will be removed from your booking page.
            </p>
            {bookingsFor(confirmDel.id) > 0 && (
              <p className="mt-3 rounded-[8px] bg-red-50 p-3 text-sm text-danger">
                Warning: {bookingsFor(confirmDel.id)} existing booking{bookingsFor(confirmDel.id) === 1 ? "" : "s"} will be deleted with it.
                Consider switching the session to inactive instead — that hides it from new buyers but keeps your history.
              </p>
            )}
            <p className="mt-3 text-xs text-inkmuted">This can't be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDel(null)} className="btn-ghost">Cancel</button>
              {bookingsFor(confirmDel.id) > 0 && (
                <button
                  onClick={() => { updateSession(confirmDel.id, { active: false }); setConfirmDel(null); setSessionMsg("Session set to inactive ✓"); setTimeout(() => setSessionMsg(""), 2500); }}
                  className="btn-ghost">
                  Make inactive
                </button>
              )}
              <button onClick={() => removeSession(confirmDel.id)} disabled={busyId === confirmDel.id}
                className="btn bg-danger text-white hover:opacity-90">
                {busyId === confirmDel.id ? "Deleting…" : "Delete session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value, bg }) {
  return (
    <div className="rounded-card p-4" style={{ background: bg }}>
      <div className="text-xs font-semibold text-ink/60">{label}</div>
      <div className="mt-0.5 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
