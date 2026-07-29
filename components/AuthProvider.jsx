"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase, apiFetch } from "@/lib/supabase";

// `ownerId` is the workspace the current account operates in: the user's own id
// for a creator, or the creator's id for a sub-admin. `permissions` is null for
// an owner (full access) or an array of allowed section keys for a sub-admin.
const Ctx = createContext({ user: null, loading: true, ownerId: null, permissions: null, isTeamMember: false });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState({ ownerId: null, permissions: null, isTeamMember: false });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user || null); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setTeam({ ownerId: null, permissions: null, isTeamMember: false }); return; }
    let alive = true;
    apiFetch("/api/me", undefined, "GET")
      .then((me) => { if (alive) setTeam({ ownerId: me.ownerId || user.id, permissions: me.permissions ?? null, isTeamMember: !!me.isTeamMember }); })
      .catch(() => { if (alive) setTeam({ ownerId: user.id, permissions: null, isTeamMember: false }); });
    return () => { alive = false; };
  }, [user]);

  const value = {
    user,
    loading,
    ownerId: team.ownerId || user?.id || null,
    permissions: team.permissions,
    isTeamMember: team.isTeamMember
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
