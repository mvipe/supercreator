"use client";
import { useEffect, useState } from "react";
import { supabase, apiFetch } from "@/lib/supabase";
import { Field } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";

const PROFESSIONS = ["Coach", "Creator", "Educator", "Consultant", "Fitness trainer", "Designer", "Agency", "Other"];

export default function CompleteProfileModal({ onClose, onSaved }) {
  const { user } = useAuth();
  const [f, setF] = useState({ full_name: "", business_name: "", email: "", profession: "Coach" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("mp_profiles").select("full_name,business_name,email,profession").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setF((s) => ({ ...s, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v)) })); });
  }, [user]);

  async function save() {
    setBusy(true); setErr("");
    try { await apiFetch("/api/profile/update", f); onSaved?.(); }
    catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Complete your profile</h2>
            <p className="text-sm text-inkmuted">Tell us a bit about you to personalise your SuperCreators.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-inkmuted hover:bg-paper" aria-label="Close">✕</button>
        </div>
        <div className="mt-5 space-y-4">
          <Field label="Your name" required><input className="input" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
          <Field label="Coaching / business name"><input className="input" value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} placeholder="e.g. FitWithAyush" /></Field>
          <Field label="Email"><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@email.com" /></Field>
          <Field label="What do you do?">
            <select className="input" value={f.profession} onChange={(e) => setF({ ...f, profession: e.target.value })}>
              {PROFESSIONS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          {err && <p className="text-sm text-danger">{err}</p>}
          <button onClick={save} disabled={busy} className="btn-brand w-full">{busy ? "Saving…" : "Save & continue"}</button>
        </div>
      </div>
    </div>
  );
}

