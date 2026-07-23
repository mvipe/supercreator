"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/supabase";
import { uid } from "@/lib/courseModel";
import { Field } from "@/components/ui";

// =============================================================
// AiQuizModal — generate MCQs with OpenAI, priced in credits.
// 1 credit = 1 question. 50 free to start, then packs.
// =============================================================

const inr = (paise) => "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 });

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function AiQuizModal({ onAdd, onClose, defaultTopic = "" }) {
  const [topic, setTopic] = useState(defaultTopic);
  const [context, setContext] = useState("");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState("medium");
  const [language, setLanguage] = useState("English");

  const [balance, setBalance] = useState(null);
  const [packs, setPacks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [buying, setBuying] = useState("");
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState(null); // generated questions awaiting confirm
  const [showBuy, setShowBuy] = useState(false);

  async function loadCredits() {
    try {
      const res = await apiFetch("/api/ai/credits", undefined, "GET");
      setBalance(res.balance);
      setPacks(res.packs || []);
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => { loadCredits(); }, []);

  async function generate() {
    setErr(""); setBusy(true);
    try {
      const res = await apiFetch("/api/ai/quiz", { topic, context, count, difficulty, language });
      setPreview(res.questions);
      setBalance(res.credits?.balance ?? balance);
    } catch (e) {
      setErr(e.message);
      // The API returns 402 + this text when credits run out.
      if (/not enough credits/i.test(e.message)) setShowBuy(true);
      loadCredits();
    } finally {
      setBusy(false);
    }
  }

  async function buy(pack) {
    setErr(""); setBuying(pack.id);
    try {
      const order = await apiFetch("/api/ai/credits/order", { packId: pack.id });
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load Razorpay. Check your connection.");

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: "INR",
        name: "SuperCreators AI credits",
        description: `${pack.credits} question credits`,
        theme: { color: "#2E6EF7" },
        handler: async (resp) => {
          try {
            const v = await apiFetch("/api/ai/credits/verify", resp);
            setBalance(v.balance);
            setShowBuy(false);
            setErr("");
          } catch (ex) {
            setErr(`${ex.message} Your payment (${resp.razorpay_payment_id}) went through — refresh and the credits should appear.`);
          } finally {
            setBuying("");
          }
        },
        modal: { ondismiss: () => setBuying("") }
      });
      rzp.on("payment.failed", (r) => { setErr(r.error?.description || "Payment failed."); setBuying(""); });
      rzp.open();
    } catch (e) {
      setErr(e.message);
      setBuying("");
    }
  }

  /** Convert the API shape into the editor's question shape. */
  function accept() {
    const qs = preview.map((q) => ({
      id: uid(),
      q: q.question,
      question: q.question,
      image: "",
      explanation: q.explanation || "",
      options: q.options.map((text, i) => ({
        id: uid(),
        text,
        image: "",
        correct: i === q.correctIndex
      }))
    }));
    onAdd(qs);
    onClose();
  }

  const notEnough = balance !== null && balance < count;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={busy ? undefined : onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-card bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div>
            <h3 className="font-display text-xl font-bold">✨ Generate questions with AI</h3>
            <p className="mt-0.5 text-sm text-inkmuted">1 credit = 1 question. Review everything before it's added.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`pill ${notEnough ? "bg-danger/10 text-danger" : "bg-brand-soft text-brand"}`}>
              {balance === null ? "…" : `${balance} credits`}
            </span>
            {!busy && <button onClick={onClose} className="text-inkmuted hover:text-ink">✕</button>}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {err && <div className="mb-4 rounded-[8px] border border-danger/30 bg-red-50 p-3 text-sm text-danger">{err}</div>}

          {/* ---- credit packs ---- */}
          {showBuy && (
            <div className="mb-5 rounded-2xl border border-line bg-paper p-4">
              <div className="text-sm font-bold">Buy more credits</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {packs.map((p) => (
                  <button key={p.id} onClick={() => buy(p)} disabled={!!buying}
                    className="rounded-xl border border-line bg-white p-3 text-left hover:border-brand disabled:opacity-60">
                    <div className="font-display text-lg font-bold">{p.credits}</div>
                    <div className="text-xs text-inkmuted">credits</div>
                    <div className="mt-1.5 text-sm font-semibold text-brand">
                      {buying === p.id ? "Opening…" : inr(p.price)}
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowBuy(false)} className="mt-3 text-xs font-semibold text-inkmuted hover:text-ink">Hide</button>
            </div>
          )}

          {/* ---- preview ---- */}
          {preview ? (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-bold">{preview.length} questions generated</div>
                <button onClick={() => setPreview(null)} className="text-xs font-semibold text-brand">← Change settings</button>
              </div>
              <div className="space-y-3">
                {preview.map((q, i) => (
                  <div key={i} className="rounded-xl border border-line p-3">
                    <div className="text-sm font-semibold">{i + 1}. {q.question}</div>
                    <div className="mt-2 grid gap-1">
                      {q.options.map((o, j) => (
                        <div key={j} className={`rounded px-2 py-1 text-sm ${j === q.correctIndex ? "bg-teal-soft font-semibold text-teal" : "text-inkmuted"}`}>
                          {String.fromCharCode(65 + j)}. {o} {j === q.correctIndex && "✓"}
                        </div>
                      ))}
                    </div>
                    {q.explanation && <div className="mt-2 text-xs text-inkmuted">💡 {q.explanation}</div>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Topic">
                <input className="input" placeholder="e.g. Photosynthesis for Class 10 CBSE"
                  value={topic} onChange={(e) => setTopic(e.target.value)} />
              </Field>

              <Field label="Or paste your material (optional — questions will stick to this)">
                <textarea className="input min-h-[110px]" placeholder="Paste notes, a syllabus, or a chapter…"
                  value={context} onChange={(e) => setContext(e.target.value.slice(0, 6000))} />
                <div className="mt-1 text-right text-xs text-inkmuted">{context.length}/6000</div>
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="How many">
                  <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                    {[5, 10, 15, 20, 25, 30, 40, 50].map((n) => <option key={n} value={n}>{n} questions</option>)}
                  </select>
                </Field>
                <Field label="Difficulty">
                  <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    {["easy", "medium", "hard", "mixed"].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Language">
                  <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                    {["English", "Hindi", "Hinglish", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Odia"].map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
              </div>

              {notEnough && (
                <div className="rounded-[8px] border border-[#F5D48A] bg-[#FEF3C7] p-3 text-sm text-[#92600A]">
                  This needs {count} credits but you have {balance}.{" "}
                  <button onClick={() => setShowBuy(true)} className="font-bold underline">Buy more</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line p-5">
          <button onClick={() => setShowBuy((v) => !v)} className="text-xs font-semibold text-inkmuted hover:text-ink">
            Buy credits
          </button>
          <div className="flex gap-2">
            {!busy && <button onClick={onClose} className="btn-ghost">Cancel</button>}
            {preview
              ? <button onClick={accept} className="btn-brand">Add {preview.length} questions</button>
              : <button onClick={generate} disabled={busy || notEnough || (!topic.trim() && !context.trim())} className="btn-brand">
                  {busy ? "Generating…" : `Generate (${count} credits)`}
                </button>}
          </div>
        </div>
      </div>
    </div>
  );
}
