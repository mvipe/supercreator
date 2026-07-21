"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// Login supports two methods:
//   • Phone OTP — existing accounts only. A brand-new number is sent to
//     /signup with the number pre-filled (no OTP is wasted on it).
//   • Email + password — for accounts created via signup.

function LoginInner() {
  const r = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const { user, loading } = useAuth();

  const [method, setMethod] = useState("phone"); // phone | email
  const [step, setStep] = useState("phone");     // phone | otp   (phone method)
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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

  async function sendPhone(e) {
    e?.preventDefault();
    if (phone.length !== 10) { setErr("Enter your 10-digit mobile number."); return; }
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, mode: "login" })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.newUser) {
        // First time here — collect their details before any OTP.
        r.push(`/signup?phone=${encodeURIComponent(json.phone)}&next=${encodeURIComponent(next)}`);
        return;
      }
      setSentTo(json.phone); setStep("otp"); setCooldown(30);
      setTimeout(() => otpRef.current?.focus(), 50);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  }

  async function verifyPhone(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: sentTo, otp })
      });
      const json = await res.json();
      if (res.status === 404 && json.newUser) {
        r.push(`/signup?phone=${encodeURIComponent(sentTo)}&next=${encodeURIComponent(next)}`);
        return;
      }
      if (!res.ok) throw new Error(json.error);
      // Redeem the one-time token for a session (password untouched).
      const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: json.token_hash });
      if (error) throw new Error(error.message);
      r.replace(next);
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  async function loginEmail(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });
      if (error) {
        throw new Error(/invalid login/i.test(error.message)
          ? "Wrong email or password. New here? Create an account below."
          : error.message);
      }
      r.replace(next);
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  const tab = (id, label) => (
    <button
      type="button"
      onClick={() => { setMethod(id); setErr(""); setStep("phone"); setOtp(""); }}
      className={`flex-1 rounded-[8px] px-3 py-2 text-sm font-semibold transition-colors ${
        method === id ? "bg-white text-ink shadow-sm" : "text-inkmuted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-8">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 font-display text-2xl font-bold">Super<span className="text-brand">Creators</span></div>

        <div className="mb-6 flex rounded-[10px] bg-paper p-1">
          {tab("phone", "Phone OTP")}
          {tab("email", "Email")}
        </div>

        {method === "phone" && step === "phone" && (
          <>
            <h1 className="font-display text-xl font-bold">Sign in with your phone</h1>
            <p className="mt-1 text-sm text-inkmuted">We&rsquo;ll text you a one-time code.</p>
            <form onSubmit={sendPhone} className="mt-6 space-y-4">
              <div>
                <label className="label">Phone number</label>
                <div className="flex overflow-hidden rounded-[10px] border border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                  <span className="flex items-center border-r border-line bg-paper px-3 text-sm font-semibold text-inkmuted">+91</span>
                  <input className="w-full px-3.5 py-2.5 text-sm outline-none" type="tel" inputMode="numeric" placeholder="98765 43210"
                    maxLength={10}
                    value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} required />
                </div>
              </div>
              {err && <p className="text-sm text-danger">{err}</p>}
              <button className="btn-ink w-full" disabled={busy}>{busy ? "Checking…" : "Continue"}</button>
            </form>
          </>
        )}

        {method === "phone" && step === "otp" && (
          <>
            <h1 className="font-display text-xl font-bold">Enter the code</h1>
            <p className="mt-1 text-sm text-inkmuted">
              Sent to +{sentTo}.{" "}
              <button className="font-semibold text-brand" onClick={() => { setStep("phone"); setOtp(""); setErr(""); }}>Change number</button>
            </p>
            <form onSubmit={verifyPhone} className="mt-6 space-y-4">
              <input ref={otpRef} className="input text-center font-display text-2xl tracking-[0.5em]" inputMode="numeric" maxLength={6}
                placeholder="••••" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} required />
              {err && <p className="text-sm text-danger">{err}</p>}
              <button className="btn-ink w-full" disabled={busy}>{busy ? "Verifying…" : "Verify & sign in"}</button>
              <button type="button" className="w-full text-center text-sm font-semibold text-brand disabled:text-inkmuted"
                disabled={cooldown > 0 || busy} onClick={() => sendPhone()}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </form>
          </>
        )}

        {method === "email" && (
          <>
            <h1 className="font-display text-xl font-bold">Sign in with email</h1>
            <p className="mt-1 text-sm text-inkmuted">Use the email and password you signed up with.</p>
            <form onSubmit={loginEmail} className="mt-6 space-y-4">
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" autoComplete="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="flex overflow-hidden rounded-[10px] border border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                  <input className="w-full px-3.5 py-2.5 text-sm outline-none" type={showPw ? "text" : "password"}
                    autoComplete="current-password" placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="px-3 text-sm text-inkmuted hover:text-ink" aria-label={showPw ? "Hide password" : "Show password"}>
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              {err && <p className="text-sm text-danger">{err}</p>}
              <button className="btn-ink w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-inkmuted">
          New to SuperCreators?{" "}
          <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-brand">Create an account</Link>
        </p>
      </div>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-inkmuted">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}