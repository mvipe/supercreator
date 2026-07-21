"use client";
import { useRef, useState } from "react";
import { parseQuestions, detectFormat, CSV_TEMPLATE, MAX_QUESTIONS } from "@/lib/quizImport";
import { uid } from "@/lib/courseModel";

// =============================================================
// QuizImportModal — paste or upload a question bank (100–150+ at once).
// Formats are sniffed, not asked for: CSV, TSV, JSON, Aiken, GIFT.
// =============================================================

const FORMATS = [
  { id: "auto", label: "Auto-detect" },
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

  function run(raw = text, fmt = format) {
    if (!raw.trim()) { setResult(null); return; }
    setResult(parseQuestions(raw, fmt));
  }

  async function onFile(file) {
    if (!file) return;
    const raw = await file.text();
    setText(raw);
    // A .json/.csv extension is a stronger hint than sniffing the body.
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const fmt = ["csv", "tsv", "json"].includes(ext) ? ext : "auto";
    setFormat(fmt);
    run(raw, fmt);
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

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "quiz-template.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const detected = text.trim() ? detectFormat(text) : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-card bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div>
            <h3 className="font-display text-xl font-bold">📥 Import questions</h3>
            <p className="mt-0.5 text-sm text-inkmuted">
              Paste or upload up to {MAX_QUESTIONS} questions. CSV, TSV, JSON, Aiken and GIFT all work.
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-inkmuted hover:text-ink">✕</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button onClick={() => fileRef.current?.click()} className="btn-ghost">📎 Upload file</button>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.json" className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])} />
            <button onClick={downloadTemplate} className="text-sm font-semibold text-brand">↓ CSV template</button>
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
            placeholder={"question,optionA,optionB,optionC,optionD,answer\nWhat is 2+2?,3,4,5,6,B\n\n…or paste JSON / Aiken / GIFT — it'll be detected."}
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