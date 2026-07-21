"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// Signup: name + email + password + phone, phone proven with an OTP.
// Arriving from login with a new number pre-fills the phone field.

function SignupInner() {
  const r = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const prefillPhone = (params.get("phone") || "").replace(/^91(\d{10})$/, "$1");
  const { user, loading } = useAuth();

  const [step, setStep] = useState("details"); // details | otp
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState(prefillPhone);
  const [sentTo, setSentTo] = useState("");
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef(null);

  useEffect(() => { if (!loading && user) r.replace(next); }, [loading, user, r, next]);
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendOtp(e) {
    e?.preventDefault();
    setErr("");
    if (!name.trim()) { setErr("Please enter your name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setErr("Enter a valid email address."); return; }
    if (password.length < 8) { setErr("Password must be at least 8 characters."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, mode: "signup" })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSentTo(json.phone); setStep("otp"); setCooldown(30);
      setTimeout(() => otpRef.current?.focus(), 50);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  async function createAccount(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone: sentTo, otp })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await supabase.auth.setSession({ access_token: json.access_token, refresh_token: json.refresh_token });
      r.replace(next);
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-8">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 font-display text-2xl font-bold">Super<span className="text-brand">Creators</span></div>

        {step === "details" ? (
          <>
            <h1 className="font-display text-xl font-bold">Create your account</h1>
            <p className="mt-1 text-sm text-inkmuted">
              {prefillPhone
                ? "This number is new to us — set up your account to continue."
                : "Sell courses, sessions and digital products from one link."}
            </p>
            <form onSubmit={sendOtp} className="mt-6 space-y-4">
              <div>
                <label className="label">Full name</label>
                <input className="input" placeholder="Your name" autoComplete="name"
                  value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" autoComplete="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="flex overflow-hidden rounded-[10px] border border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                  <input className="w-full px-3.5 py-2.5 text-sm outline-none" type={showPw ? "text" : "password"}
                    autoComplete="new-password" placeholder="At least 8 characters"
                    value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="px-3 text-sm text-inkmuted hover:text-ink" aria-label={showPw ? "Hide password" : "Show password"}>
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Phone number</label>
                <div className="flex overflow-hidden rounded-[10px] border border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                  <span className="flex items-center border-r border-line bg-paper px-3 text-sm font-semibold text-inkmuted">+91</span>
                  <input className="w-full px-3.5 py-2.5 text-sm outline-none" type="tel" inputMode="numeric" placeholder="98765 43210"
                    value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
                <p className="mt-1 text-xs text-inkmuted">We&rsquo;ll verify this with an OTP.</p>
              </div>
              {err && <p className="text-sm text-danger">{err}</p>}
              <button className="btn-ink w-full" disabled={busy}>{busy ? "Sending OTP…" : "Continue"}</button>
            </form>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-bold">Verify your number</h1>
            <p className="mt-1 text-sm text-inkmuted">
              Code sent to +{sentTo}.{" "}
              <button className="font-semibold text-brand" onClick={() => { setStep("details"); setOtp(""); setErr(""); }}>Edit details</button>
            </p>
            <form onSubmit={createAccount} className="mt-6 space-y-4">
              <input ref={otpRef} className="input text-center font-display text-2xl tracking-[0.5em]" inputMode="numeric" maxLength={6}
                placeholder="••••" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} required />
              {err && <p className="text-sm text-danger">{err}</p>}
              <button className="btn-ink w-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
              <button type="button" className="w-full text-center text-sm font-semibold text-brand disabled:text-inkmuted"
                disabled={cooldown > 0 || busy} onClick={() => sendOtp()}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-inkmuted">
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-brand">Sign in</Link>
        </p>
      </div>
    </main>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-inkmuted">Loading…</div>}>
      <SignupInner />
    </Suspense>
  );
}
