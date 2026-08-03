"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase, apiFetch } from "@/lib/supabase";
import { fetchMe } from "@/lib/plan";
import { useAuth } from "@/components/AuthProvider";
import { I, ICONS } from "@/components/dashboard/Icons";
import SubscriptionModal from "@/components/SubscriptionModal";
import SupportButton from "@/components/SupportButton";
import { TEAM_PERMISSIONS, can } from "@/lib/team";

const PERM_BY_PATH = Object.fromEntries(TEAM_PERMISSIONS.map((p) => [p.path, p.key]));

const MAIN = [
  { href: "/dashboard", label: "Getting Started", icon: ICONS.home },
  { href: "/dashboard/store", label: "Store", icon: ICONS.store },
  { href: "/dashboard/payments", label: "Payments", icon: ICONS.payments },
  { href: "/dashboard/payouts", label: "Payouts", icon: ICONS.refer },
  { href: "/dashboard/learn", label: "Learn", icon: ICONS.learn },
  { href: "/dashboard/audience", label: "Audience", icon: ICONS.audience },
  { href: "/dashboard/refer", label: "Refer & Earn", icon: ICONS.refer }
];
const APPS = [
  { href: "/dashboard/courses", label: "Courses", icon: ICONS.course },
  { href: "/dashboard/bookings", label: "Bookings", icon: ICONS.booking },
  { href: "/dashboard/events", label: "Events", icon: ICONS.event },
  { href: "/dashboard/pages", label: "Payment Pages", icon: ICONS.page },
  { href: "/dashboard/books", label: "Books", icon: ICONS.learn },
  { href: "/dashboard/locked", label: "Locked Content", icon: ICONS.locked }
];

export default function DashLayout({ children }) {
  const { user, loading, permissions, isTeamMember } = useAuth();

  // Sub-admins only see the sections their owner granted (home always shows).
  const allowed = (href) => {
    if (!isTeamMember) return true;
    if (href === "/dashboard" || href === "/dashboard/apps") return true;
    const key = PERM_BY_PATH[href];
    return key ? can(permissions, key) : false;
  };
  const r = useRouter();
  const path = usePathname();
  const ensured = useRef(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPro, setIsPro] = useState(true); // assume true until known, so no flash
  const [blocked, setBlocked] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => { if (!loading && !user) r.replace("/login"); }, [loading, user, r]);
  useEffect(() => {
    if (user && !ensured.current) {
      ensured.current = true;
      const ref = typeof window !== "undefined" ? localStorage.getItem("mp_ref") : null;
      apiFetch("/api/profile/ensure", { ref }).catch(() => {});
      fetchMe().then((me) => { setIsAdmin(!!me.admin); setIsPro(!!me.isPro); setBlocked(!!me.blocked); });
    }
  }, [user]);

  useEffect(() => {
    if (user && !userProfile) {
      supabase.from("mp_profiles").select("full_name, display_name, phone_number").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => setUserProfile(data));
    }
  }, [user, userProfile]);

  useEffect(() => {
    setMobileNavOpen(false);
    setProfileMenuOpen(false);
  }, [path]);

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center text-inkmuted">Loading…</div>;

  const displayName = userProfile?.full_name || userProfile?.display_name || "Profile";
  const initials = displayName.trim().slice(0, 2).toUpperCase() || "SC";

  const NavLink = ({ n, onClick, theme = "dark" }) => {
    const active = path === n.href || (n.href !== "/dashboard" && path.startsWith(n.href));
    if (theme === "light") {
      return (
        <Link href={n.href}
          onClick={onClick}
          className={`flex items-center gap-3 rounded-[13px] px-3.5 py-2.5 text-sm font-medium transition-colors ${
            active
              ? "bg-[linear-gradient(120deg,#252166,#353181)] text-white font-semibold shadow-[0_9px_15px_#302d7626]"
              : "text-[#697595] hover:bg-[#f5f5fb] hover:text-[#252166]"
          }`}>
          <I d={n.icon} /> <span className="flex-1">{n.label}</span>
        </Link>
      );
    }
    return (
      <Link href={n.href}
        onClick={onClick}
        className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"}`}>
        <I d={n.icon} /> {n.label}
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {mobileNavOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/45 md:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[85vw] max-w-80 shrink-0 flex-col bg-white text-[#11162c] transition-transform duration-200 md:hidden ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileNavOpen(false)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[linear-gradient(135deg,#7359f4,#4b32c9)] text-white shadow-[0_6px_14px_#7359f440]"><I d={ICONS.bolt} size={17} /></span>
            <span className="font-display text-lg"><b className="font-bold">Super</b>Creators</span>
          </Link>
          <button aria-label="Close menu" className="rounded-lg p-2 text-[#697595] hover:bg-[#f5f5fb]" onClick={() => setMobileNavOpen(false)}>✕</button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3.5 pb-4">
          {MAIN.filter((n) => allowed(n.href)).map((n) => <NavLink key={`m-${n.href}`} n={n} theme="light" onClick={() => setMobileNavOpen(false)} />)}
          {!isTeamMember && <NavLink n={{ href: "/dashboard/team", label: "Sub-Admins", icon: ICONS.audience }} theme="light" onClick={() => setMobileNavOpen(false)} />}
          {isAdmin && (
            <Link href="/admin" onClick={() => setMobileNavOpen(false)}
              className={`flex items-center gap-3 rounded-[13px] px-3.5 py-2.5 text-sm font-semibold transition-colors ${path.startsWith("/admin") ? "bg-[linear-gradient(120deg,#252166,#353181)] text-white" : "text-[#2E6EF7] hover:bg-[#f5f5fb]"}`}>
              <I d={ICONS.payments} /> Admin
            </Link>
          )}
          <div className="px-3.5 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-[#7760d7]">Apps &amp; Tools</div>
          {APPS.filter((n) => allowed(n.href)).map((n) => <NavLink key={`m-app-${n.href}`} n={n} theme="light" onClick={() => setMobileNavOpen(false)} />)}
          <Link href="/dashboard/apps" onClick={() => setMobileNavOpen(false)}
            className="mt-4 flex items-center justify-center gap-2.5 rounded-[15px] bg-[linear-gradient(110deg,#356dfb,#8e49ee_59%,#fa5ca4)] px-3.5 py-3.5 text-sm font-semibold text-white shadow-[0_9px_20px_#8453ec40]">
            <I d={ICONS.apps} size={15} /> Explore All Apps
          </Link>
        </nav>

        {!isPro && (
          <div className="mx-3.5 mb-3 rounded-[12px] bg-[linear-gradient(135deg,#6a42dc,#332281)] p-4">
            <div className="text-sm font-bold text-white">You're on the Free plan</div>
            <p className="mt-0.5 text-xs text-white/75">Unlock all features and get paid.</p>
            <button onClick={() => { setMobileNavOpen(false); setShowSub(true); }}
              className="mt-3 w-full rounded-[8px] bg-white px-3 py-2 text-sm font-bold text-[#332281] shadow hover:bg-white/90">
              Upgrade to Pro 🚀
            </button>
          </div>
        )}

        <div className="border-t border-[#edf0f7] p-4">
          <div className="relative">
            <button onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-[#f5f5fb]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#bd8dff,#6544e8)] text-sm font-semibold text-white">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[#11162c]">{displayName}</div>
                <div className="text-xs text-[#8992ad]">{isPro ? "Pro Plan" : "Free Plan"}</div>
              </div>
              <span className={`text-[#8992ad] transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`}>⌄</span>
            </button>
            {profileMenuOpen && (
              <div onClick={(e) => e.stopPropagation()}
                className="absolute bottom-14 left-0 right-0 z-20 w-full overflow-hidden rounded-xl border border-[#edf0f7] bg-white shadow-lg">
                <Link href="/dashboard/settings/profile"
                  className="block px-4 py-2.5 text-sm text-[#3c4257] hover:bg-[#f5f5fb]"
                  onClick={() => { setProfileMenuOpen(false); setMobileNavOpen(false); }}>
                  Profile
                </Link>
                <Link href="/dashboard/settings/billing"
                  className="block px-4 py-2.5 text-sm text-[#3c4257] hover:bg-[#f5f5fb]"
                  onClick={() => { setProfileMenuOpen(false); setMobileNavOpen(false); }}>
                  Billing
                </Link>
                <Link href="/dashboard/settings/notifications"
                  className="block px-4 py-2.5 text-sm text-[#3c4257] hover:bg-[#f5f5fb]"
                  onClick={() => { setProfileMenuOpen(false); setMobileNavOpen(false); }}>
                  Notifications
                </Link>
                <button onClick={async () => {
                  await supabase.auth.signOut();
                  r.replace("/login");
                  setProfileMenuOpen(false);
                  setMobileNavOpen(false);
                }} className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-brand hover:bg-[#f5f5fb]">
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-[#edf0f7] bg-white md:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-6 py-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[linear-gradient(135deg,#7359f4,#4b32c9)] text-white shadow-[0_6px_14px_#7359f440]"><I d={ICONS.bolt} size={17} /></span>
          <span className="font-display text-lg text-[#11162c]"><b className="font-bold">Super</b>Creators</span>
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3.5 pb-4">
          {MAIN.filter((n) => allowed(n.href)).map((n) => <NavLink key={n.href} n={n} theme="light" />)}
          {!isTeamMember && <NavLink n={{ href: "/dashboard/team", label: "Sub-Admins", icon: ICONS.audience }} theme="light" />}
          {isAdmin && (
            <Link href="/admin"
              className={`flex items-center gap-3 rounded-[13px] px-3.5 py-2.5 text-sm font-semibold transition-colors ${path.startsWith("/admin") ? "bg-[linear-gradient(120deg,#252166,#353181)] text-white" : "text-[#2E6EF7] hover:bg-[#f5f5fb]"}`}>
              <I d={ICONS.payments} /> Admin
            </Link>
          )}
          <div className="px-3.5 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-[#7760d7]">Apps &amp; Tools</div>
          {APPS.filter((n) => allowed(n.href)).map((n) => <NavLink key={n.href} n={n} theme="light" />)}
          <Link href="/dashboard/apps"
            className="mt-4 flex items-center justify-center gap-2.5 rounded-[15px] bg-[linear-gradient(110deg,#356dfb,#8e49ee_59%,#fa5ca4)] px-3.5 py-3.5 text-sm font-semibold text-white shadow-[0_9px_20px_#8453ec40] transition-transform hover:scale-[1.01]">
            <I d={ICONS.apps} size={15} /> Explore All Apps
          </Link>
        </nav>

        {!isPro && (
          <div className="mx-3.5 mb-3 rounded-[12px] bg-[linear-gradient(135deg,#6a42dc,#332281)] p-4">
            <div className="text-sm font-bold text-white">You're on the Free plan</div>
            <p className="mt-0.5 text-xs text-white/75">Unlock all features and get paid.</p>
            <button onClick={() => setShowSub(true)}
              className="mt-3 w-full rounded-[8px] bg-white px-3 py-2 text-sm font-bold text-[#332281] shadow hover:bg-white/90">
              Upgrade to Pro 🚀
            </button>
          </div>
        )}

        <div className="border-t border-[#edf0f7] p-4">
          <div className="relative">
            <button onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-[#f5f5fb]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#bd8dff,#6544e8)] text-sm font-semibold text-white">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[#11162c]">{displayName}</div>
                <div className="text-xs text-[#8992ad]">{isPro ? "Pro Plan" : "Free Plan"}</div>
              </div>
              <span className={`text-[#8992ad] transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`}>⌄</span>
            </button>
            {profileMenuOpen && (
              <div onClick={(e) => e.stopPropagation()}
                className="absolute bottom-14 left-0 right-0 z-20 w-full overflow-hidden rounded-xl border border-[#edf0f7] bg-white shadow-lg">
                <Link href="/dashboard/settings/profile"
                  className="block px-4 py-2.5 text-sm text-[#3c4257] hover:bg-[#f5f5fb]"
                  onClick={() => setProfileMenuOpen(false)}>
                  Profile
                </Link>
                <Link href="/dashboard/settings/billing"
                  className="block px-4 py-2.5 text-sm text-[#3c4257] hover:bg-[#f5f5fb]"
                  onClick={() => setProfileMenuOpen(false)}>
                  Billing
                </Link>
                <Link href="/dashboard/settings/notifications"
                  className="block px-4 py-2.5 text-sm text-[#3c4257] hover:bg-[#f5f5fb]"
                  onClick={() => setProfileMenuOpen(false)}>
                  Notifications
                </Link>
                <button onClick={async () => {
                  await supabase.auth.signOut();
                  r.replace("/login");
                  setProfileMenuOpen(false);
                }} className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-brand hover:bg-[#f5f5fb]">
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      <div className="h-screen min-w-0 flex-1 overflow-y-auto" style={{ backgroundColor: "#fbfcff", backgroundImage: "radial-gradient(circle at 82% 0%, #eff0ff 0%, transparent 32%)" }}>
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
          <button
            aria-label="Open sidebar"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink hover:bg-paper"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          </button>
          <span className="font-display text-base font-bold">Dashboard</span>
          <span className="w-10" />
        </div>
        {blocked && (
          <div className="bg-danger px-6 py-2.5 text-center text-sm font-semibold text-white">
            Your account is restricted. You can't publish or receive payments right now. Please contact support.
          </div>
        )}
        {/* pb-20 keeps content clear of the mobile bottom nav */}
        <div className="pb-20 md:pb-0">{children}</div>
      </div>

      <MobileBottomNav path={path} onMore={() => setMobileNavOpen(true)} />

      {showSub && (
        <SubscriptionModal onClose={() => setShowSub(false)}
          onSuccess={() => { setShowSub(false); setIsPro(true); }} />
      )}
      <SupportButton />
    </div>
  );
}

/* ---------------- mobile bottom nav ---------------- */

const BOTTOM = [
  { href: "/dashboard", label: "Home", icon: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
    </svg>
  ) },
  { href: "/dashboard/store", label: "Store", icon: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" {...p}>
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
    </svg>
  ) },
  { href: "/dashboard/apps", label: "Apps", icon: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" {...p}>
      <rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" /><path d="M17 14v6M14 17h6" />
    </svg>
  ) },
  { href: "/dashboard/payments", label: "Payments", icon: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" {...p}>
      <rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10.5h18M7 15h4" />
    </svg>
  ) }
];

/** Fixed bottom navigation — mobile only, mirrors the app-style tab bar. */
function MobileBottomNav({ path, onMore }) {
  const active = (href) => (href === "/dashboard" ? path === href : path.startsWith(href));
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-white/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      {BOTTOM.map((it) => {
        const Icon = it.icon;
        const on = active(it.href);
        return (
          <Link key={it.href} href={it.href}
            className={`relative flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5 text-[11px] font-semibold ${on ? "text-brand" : "text-inkmuted"}`}>
            {on && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-brand" />}
            <Icon className="h-[22px] w-[22px]" />
            {it.label}
          </Link>
        );
      })}
      <button onClick={onMore}
        className="flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5 text-[11px] font-semibold text-inkmuted">
        <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        More
      </button>
    </nav>
  );
}
