"use client";
import { useRef, useState } from "react";
import { parseQuestions, detectFormat, CSV_TEMPLATE, DOC_TEMPLATE, MAX_QUESTIONS } from "@/lib/quizImport";
import { uid } from "@/lib/courseModel";
import { apiFetch } from "@/lib/supabase";
import { fileToText, bufferToText, quizTemplateDocx } from "@/lib/docText";

// =============================================================
// QuizImportModal — paste, upload or link a question bank (100–150+ at once).
// Formats are sniffed, not asked for: Word/Google-Doc style, CSV, TSV, JSON,
// Aiken, GIFT. Files: .docx, .pdf, .txt, .csv, .tsv, .json. Links: Google
// Docs / Sheets / Drive / Dropbox.
// =============================================================

const FORMATS = [
  { id: "auto", label: "Auto-detect" },
  { id: "doc", label: "Document (Word / Google Doc)" },
  { id: "csv", label: "CSV" },
  { id: "tsv", label: "TSV" },
  { id: "json", label: "JSON" },
  { id: "aiken", label: "Aiken (.txt)" },
  { id: "gift", label: "GIFT (Moodle)" }
];

export default function QuizImportModal({ onAdd, onClose }) {
  const [text, setText] = useState("");
  const [format, setFormat] = useState("auto");
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState("append"); // append | replace
  const fileRef = useRef(null);
  const [busy, setBusy] = useState("");      // "" | "file" | "link"
  const [loadErr, setLoadErr] = useState("");
  const [link, setLink] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [source, setSource] = useState("");

  function run(raw = text, fmt = format) {
    if (!raw.trim()) { setResult(null); return; }
    setResult(parseQuestions(raw, fmt));
  }

  async function onFile(file) {
    if (!file) return;
    setBusy("file"); setLoadErr("");
    try {
      const raw = await fileToText(file);
      setText(raw);
      setSource(file.name);
      // A .json/.csv extension is a stronger hint than sniffing the body.
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const fmt = ["csv", "tsv", "json"].includes(ext) ? ext : "auto";
      setFormat(fmt);
      run(raw, fmt);
    } catch (e) {
      setLoadErr(e.message);
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /** Google Docs / Sheets / Drive / Dropbox link -> text, via the server. */
  async function onLink() {
    if (!link.trim()) return;
    setBusy("link"); setLoadErr("");
    try {
      const res = await apiFetch("/api/import/link", { url: link.trim() });
      const bin = atob(res.data);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const raw = await bufferToText(u8.buffer, res.name || "");
      setText(raw);
      setSource(res.name || "link");
      const fmt = /\.csv$/i.test(res.name || "") ? "csv" : "auto";
      setFormat(fmt);
      run(raw, fmt);
    } catch (e) {
      setLoadErr(e.message);
    } finally {
      setBusy("");
    }
  }

  function accept() {
    if (!result?.questions?.length) return;
    // Map to the editor's shape (it uses `q` + option objects).
    const qs = result.questions.map((q) => ({
      id: uid(),
      q: q.question,
      question: q.question,
      image: "",
      explanation: q.explanation || "",
      points: q.points || 1,
      options: q.options.map((o) => ({ id: uid(), text: o.text, image: "", correct: !!o.correct }))
    }));
    onAdd(qs, mode);
    onClose();
  }

  function save(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const downloadTemplate = (kind) => {
    if (kind === "docx") save(new Blob([quizTemplateDocx(DOC_TEMPLATE)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "quiz-template.docx");
    else if (kind === "txt") save(new Blob([DOC_TEMPLATE], { type: "text/plain" }), "quiz-template.txt");
    else save(new Blob([CSV_TEMPLATE], { type: "text/csv" }), "quiz-template.csv");
  };

  const detected = text.trim() ? detectFormat(text) : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-card bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div>
            <h3 className="font-display text-xl font-bold">📥 Import questions</h3>
            <p className="mt-0.5 text-sm text-inkmuted">
              Type your quiz in Word or Google Docs and upload it — or paste / link up to {MAX_QUESTIONS} questions.
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-inkmuted hover:text-ink">✕</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* ---- Ways in: upload a document, or paste a link ---- */}
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={() => fileRef.current?.click()} disabled={!!busy}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line px-4 py-5 text-center hover:border-brand disabled:opacity-60">
              <span className="text-2xl">📄</span>
              <span className="text-sm font-semibold">{busy === "file" ? "Reading file…" : "Upload a document"}</span>
              <span className="text-xs text-inkmuted">Word (.docx), PDF, .txt, CSV or JSON</span>
            </button>
            <input ref={fileRef} type="file" accept=".docx,.pdf,.txt,.md,.csv,.tsv,.json,.gift,.doc,.htm,.html" className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])} />
            <div className="rounded-xl border border-line p-4">
              <div className="text-sm font-semibold">🔗 Import from a link</div>
              <div className="mt-0.5 text-xs text-inkmuted">Google Doc / Sheet / Drive file / Dropbox — shared as &ldquo;Anyone with the link&rdquo;</div>
              <div className="mt-2 flex gap-2">
                <input className="input !py-2 text-sm" placeholder="https://docs.google.com/document/d/…" value={link}
                  onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onLink()} />
                <button onClick={onLink} disabled={!!busy || !link.trim()} className="btn-brand shrink-0 !px-3 !py-2 text-xs">{busy === "link" ? "…" : "Fetch"}</button>
              </div>
            </div>
          </div>
          {loadErr && <div className="mt-3 rounded-[8px] bg-red-50 px-3 py-2 text-sm text-danger">{loadErr}</div>}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="text-xs text-inkmuted">Templates:</span>
            <button onClick={() => downloadTemplate("docx")} className="font-semibold text-brand">↓ Word (.docx)</button>
            <button onClick={() => downloadTemplate("txt")} className="font-semibold text-brand">↓ Text (.txt)</button>
            <button onClick={() => downloadTemplate("csv")} className="font-semibold text-brand">↓ CSV / Excel</button>
            <button onClick={() => setShowGuide((v) => !v)} className="font-semibold text-inkmuted hover:text-ink">{showGuide ? "Hide" : "How to write"} the document format</button>
          </div>

          {showGuide && (
            <div className="mt-3 grid gap-3 rounded-xl border border-line bg-paper p-4 text-xs sm:grid-cols-2">
              <pre className="whitespace-pre-wrap rounded-lg bg-white p-3 font-mono leading-relaxed">{`1. What is 2 + 2?
a) 3
b) 4
c) 5
d) 6
Answer: b
Explanation: 2 + 2 = 4
Marks: 1

2. Capital of India?
a) Mumbai
b) New Delhi *
c) Kolkata`}</pre>
              <ul className="space-y-1.5 text-inkmuted">
                <li>• <b className="text-ink">Number each question</b> — 1. / Q1) / Question 1: all work (Word&rsquo;s auto-numbering too).</li>
                <li>• <b className="text-ink">Letter each option</b> — a) / (a) / A. — one per line, or all on one line.</li>
                <li>• <b className="text-ink">Mark the answer</b> with <code>Answer: b</code>, or put <code>*</code> / ✓ after the right option.</li>
                <li>• More than one right answer: <code>Answer: a, c</code>.</li>
                <li>• Optional: <code>Explanation:</code> and <code>Marks:</code> lines.</li>
                <li>• Questions without numbers are fine if a blank line separates them.</li>
              </ul>
            </div>
          )}

          <div className="mb-2 mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-inkmuted">{source ? `From ${source} — edit below if needed` : "…or paste your questions"}</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-inkmuted">Format</span>
              <select className="input !w-auto !py-1.5 text-sm" value={format}
                onChange={(e) => { setFormat(e.target.value); run(text, e.target.value); }}>
                {FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
          </div>

          <textarea
            className="input min-h-[180px] font-mono text-xs"
            placeholder={"1. What is 2 + 2?\na) 3\nb) 4\nc) 5\nAnswer: b\n\n…or paste CSV / JSON / Aiken / GIFT — it'll be detected."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => run()}
          />

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button onClick={() => run()} className="btn-ghost">Preview</button>
            {detected && <span className="text-xs text-inkmuted">Detected: <b className="text-ink">{detected.toUpperCase()}</b></span>}
          </div>

          {result && (
            <div className="mt-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`pill ${result.questions.length ? "bg-teal-soft text-teal" : "bg-danger/10 text-danger"}`}>
                  {result.questions.length} question{result.questions.length === 1 ? "" : "s"} ready
                </span>
                {result.errors.length > 0 && (
                  <span className="pill bg-[#FEF3C7] text-[#92600A]">{result.errors.length} warning{result.errors.length === 1 ? "" : "s"}</span>
                )}
              </div>

              {result.errors.length > 0 && (
                <ul className="mt-3 max-h-28 space-y-1 overflow-y-auto rounded-[8px] border border-[#F5D48A] bg-[#FEF3C7] p-3 text-xs text-[#92600A]">
                  {result.errors.slice(0, 20).map((e, i) => <li key={i}>• {e}</li>)}
                  {result.errors.length > 20 && <li>• …and {result.errors.length - 20} more</li>}
                </ul>
              )}

              {result.questions.length > 0 && (
                <>
                  <div className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-line p-3">
                    {result.questions.slice(0, 30).map((q, i) => (
                      <div key={q.id} className="border-b border-line pb-2 last:border-0">
                        <div className="text-sm font-semibold">{i + 1}. {q.question}</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {q.options.map((o, j) => (
                            <span key={o.id} className={`rounded px-1.5 py-0.5 text-xs ${o.correct ? "bg-teal-soft font-semibold text-teal" : "bg-paper text-inkmuted"}`}>
                              {String.fromCharCode(65 + j)}. {o.text}{o.correct ? " ✓" : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {result.questions.length > 30 && (
                      <div className="pt-1 text-center text-xs text-inkmuted">…and {result.questions.length - 30} more</div>
                    )}
                  </div>

                  <div className="mt-3 flex gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="radio" className="accent-brand" checked={mode === "append"} onChange={() => setMode("append")} />
                      Add to existing questions
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" className="accent-brand" checked={mode === "replace"} onChange={() => setMode("replace")} />
                      Replace all
                    </label>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line p-5">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={accept} disabled={!result?.questions?.length} className="btn-brand">
            Import {result?.questions?.length || 0} questions
          </button>
        </div>
      </div>
    </div>
  );
}