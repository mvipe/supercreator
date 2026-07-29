"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { TEAM_PERMISSIONS } from "@/lib/team";

export default function TeamPage() {
  const { isTeamMember } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | member object

  async function load() {
    setLoading(true); setErr("");
    try { const d = await apiFetch("/api/team", undefined, "GET"); setMembers(d.members || []); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (!isTeamMember) load(); }, [isTeamMember]);

  async function toggleActive(m) {
    try { await apiFetch("/api/team", { id: m.id, active: !m.active }, "PATCH"); await load(); }
    catch (e) { alert(e.message); }
  }
  async function remove(m) {
    if (!confirm(`Remove sub-admin ${m.name || m.email}? Their login will stop working.`)) return;
    try { await apiFetch("/api/team", { id: m.id }, "DELETE"); await load(); }
    catch (e) { alert(e.message); }
  }

  if (isTeamMember) {
    return <div className="p-8 text-center text-sm text-inkmuted">Sub-admins can't manage the team.</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Sub-Admins</h1>
          <p className="mt-0.5 text-sm text-inkmuted">Give trusted teammates their own login with only the access you choose.</p>
        </div>
        <button onClick={() => setEditing("new")} className="btn-brand shrink-0">+ Add Sub-Admin</button>
      </div>

      {err && <div className="mt-4 rounded-[8px] border border-danger/30 bg-red-50 p-4 text-sm text-danger">{err}</div>}

      <div className="card mt-6 overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
          <div className="col-span-4">Sub-admin</div><div className="col-span-4">Access</div>
          <div className="col-span-2 text-center">Status</div><div className="col-span-2 text-right">Actions</div>
        </div>
        {loading && <div className="px-5 py-12 text-center text-sm text-inkmuted">Loading…</div>}
        {!loading && members.length === 0 && (
          <div className="px-5 py-16 text-center text-sm text-inkmuted">No sub-admins yet. Click “Add Sub-Admin” to invite one.</div>
        )}
        {members.map((m) => (
          <div key={m.id} className="grid min-w-[640px] grid-cols-12 items-center gap-4 border-b border-line px-5 py-3.5 text-sm last:border-0">
            <div className="col-span-4 min-w-0">
              <div className="truncate font-semibold">{m.name || "—"}</div>
              <div className="truncate text-xs text-inkmuted">{m.email}</div>
            </div>
            <div className="col-span-4 text-xs text-inkmuted">
              {(m.permissions || []).length === 0 ? "No sections" :
                (m.permissions || []).map((k) => TEAM_PERMISSIONS.find((p) => p.key === k)?.label || k).join(", ")}
            </div>
            <div className="col-span-2 text-center">
              <button onClick={() => toggleActive(m)}
                className={`pill ${m.active ? "bg-teal-soft text-teal" : "bg-red-50 text-danger"}`}>
                {m.active ? "Active" : "Disabled"}
              </button>
            </div>
            <div className="col-span-2 flex items-center justify-end gap-2">
              <button onClick={() => setEditing(m)} className="btn-ghost text-xs">Edit</button>
              <button onClick={() => remove(m)} className="btn-ghost text-xs text-danger">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <SubAdminModal
          member={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function SubAdminModal({ member, onClose, onSaved }) {
  const isNew = !member;
  const [name, setName] = useState(member?.name || "");
  const [email, setEmail] = useState(member?.email || "");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [perms, setPerms] = useState(() => new Set(member?.permissions || []));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const toggle = (k) => setPerms((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  async function save(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      if (isNew) {
        await apiFetch("/api/team", { name, email, password, permissions: [...perms] }, "POST");
      } else {
        await apiFetch("/api/team", { id: member.id, name, permissions: [...perms] }, "PATCH");
      }
      onSaved();
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <h2 className="font-display text-lg font-bold">{isNew ? "Add New Sub-Admin" : "Edit Sub-Admin"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-inkmuted hover:bg-paper" aria-label="Close">✕</button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className="label">Email {isNew && <span className="req">*</span>}</label>
            <input className="input" type="email" value={email} disabled={!isNew}
              onChange={(e) => setEmail(e.target.value)} placeholder="teammate@email.com" />
            {!isNew && <p className="mt-1 text-xs text-inkmuted">Email can't be changed after creation.</p>}
          </div>
          {isNew && (
            <div>
              <label className="label">Password <span className="req">*</span></label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-inkmuted">{showPw ? "🙈" : "👁"}</button>
              </div>
            </div>
          )}

          <div>
            <label className="label">Permissions — which sections they can use</label>
            <div className="mt-1 divide-y divide-line rounded-xl border border-line">
              {TEAM_PERMISSIONS.map((p) => (
                <label key={p.key} className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm">
                  <span>{p.label}</span>
                  <input type="checkbox" className="h-5 w-9 shrink-0 accent-brand" checked={perms.has(p.key)} onChange={() => toggle(p.key)} />
                </label>
              ))}
            </div>
          </div>

          {err && <p className="text-sm text-danger">{err}</p>}
          <button className="btn-brand w-full py-3" disabled={busy}>
            {busy ? "Saving…" : isNew ? "Create Sub-Admin" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
