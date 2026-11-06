// =============================================================
// SuperCreators — bulk quiz import.
//
// Teachers arrive with question banks in whatever shape their old tool spat
// out, so this sniffs the format instead of demanding one:
//
//   CSV / TSV   question, optionA..D, answer, explanation
//   JSON        [{ question, options, answer }]
//   Aiken       classic plain-text MCQ format (Moodle standard)
//   GIFT        Moodle's brace format
//   DOC         the way teachers actually type a quiz in Word / Google Docs:
//                 1. Question?   a) opt   b) opt *   Answer: B   Explanation: …
//               (also what .docx / .pdf / Google Doc imports become)
//
// Everything normalises to the app's question shape:
//   { id, question, options: [{ id, text, correct }], explanation, points }
// =============================================================

import { uid } from "@/lib/courseModel";

export const MAX_QUESTIONS = 300; // comfortably over the 100–150 target

const LETTERS = "ABCDEFGHIJ";

function mkQuestion({ question, options, correctIdx, explanation = "", points = 1 }) {
  return {
    id: uid(),
    question: String(question || "").trim(),
    type: "single",
    points: Number(points) || 1,
    explanation: String(explanation || "").trim(),
    options: options.map((text, i) => ({
      id: uid(),
      text: String(text ?? "").trim(),
      correct: Array.isArray(correctIdx) ? correctIdx.includes(i) : i === correctIdx
    }))
  };
}

/* ---------------- CSV / TSV ---------------- */

/** RFC4180-ish splitter: handles quoted fields, escaped quotes, newlines. */
export function parseDelimited(text, delim) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === delim) { row.push(field); field = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Map a header row to column indices, tolerating lots of naming variants. */
function mapHeader(header) {
  const idx = {};
  header.forEach((h, i) => {
    const k = norm(h);
    if (!idx.question && /^(question|q|questiontext|prompt|ques)$/.test(k)) idx.question = i;
    else if (/^(optiona|a|option1|choice1|choicea|opt1|opta)$/.test(k)) idx.a = i;
    else if (/^(optionb|b|option2|choice2|choiceb|opt2|optb)$/.test(k)) idx.b = i;
    else if (/^(optionc|c|option3|choice3|choicec|opt3|optc)$/.test(k)) idx.c = i;
    else if (/^(optiond|d|option4|choice4|choiced|opt4|optd)$/.test(k)) idx.d = i;
    else if (/^(optione|e|option5|choice5|choicee|opt5|opte)$/.test(k)) idx.e = i;
    else if (!idx.answer && /^(answer|correct|correctanswer|ans|key|correctoption|solution)$/.test(k)) idx.answer = i;
    else if (!idx.explanation && /^(explanation|explain|reason|rationale|why|note)$/.test(k)) idx.explanation = i;
    else if (!idx.points && /^(points|marks|score|weight|mark)$/.test(k)) idx.points = i;
  });
  return idx;
}

/**
 * Resolve an answer cell to option indices. Accepts "B", "b", "2",
 * "Option B", the literal answer text, or "A,C" for multi-answer.
 */
function resolveAnswer(raw, options) {
  const s = String(raw || "").trim();
  if (!s) return [];
  const parts = s.split(/[,;|]+/).map((x) => x.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const cleaned = p.replace(/^option\s*/i, "").trim();
    // letter
    if (/^[a-jA-J]$/.test(cleaned)) {
      const i = LETTERS.indexOf(cleaned.toUpperCase());
      if (i >= 0 && i < options.length) { out.push(i); continue; }
    }
    // 1-based number
    if (/^\d+$/.test(cleaned)) {
      const i = parseInt(cleaned, 10) - 1;
      if (i >= 0 && i < options.length) { out.push(i); continue; }
    }
    // literal text match
    const i = options.findIndex((o) => norm(o) === norm(cleaned));
    if (i >= 0) out.push(i);
  }
  return [...new Set(out)];
}

function fromDelimited(text, delim) {
  const rows = parseDelimited(text, delim);
  if (rows.length < 2) return { questions: [], errors: ["Need a header row plus at least one question."] };

  const idx = mapHeader(rows[0]);
  const errors = [];

  // Headerless fallback: assume question, A, B, C, D, answer
  const headerless = idx.question === undefined || idx.a === undefined;
  const body = headerless ? rows : rows.slice(1);
  if (headerless) {
    errors.push("No recognisable header found — assuming column order: question, A, B, C, D, answer, explanation.");
  }

  const questions = [];
  body.forEach((r, n) => {
    const line = headerless ? n + 1 : n + 2;
    const get = (key, pos) => (headerless ? r[pos] : r[idx[key]]);

    const q = String(get("question", 0) || "").trim();
    if (!q) return; // skip blank rows silently

    const opts = ["a", "b", "c", "d", "e"]
      .map((k, i) => get(k, i + 1))
      .map((v) => String(v ?? "").trim())
      .filter((v) => v !== "");

    if (opts.length < 2) { errors.push(`Row ${line}: needs at least 2 options — skipped.`); return; }

    const ansRaw = get("answer", 5);
    const correct = resolveAnswer(ansRaw, opts);
    if (!correct.length) {
      errors.push(`Row ${line}: couldn't match answer "${ansRaw || ""}" to an option — defaulted to A, please check.`);
    }

    questions.push(mkQuestion({
      question: q,
      options: opts,
      correctIdx: correct.length ? correct : [0],
      explanation: get("explanation", 6) || "",
      points: (headerless ? null : idx.points !== undefined ? r[idx.points] : null) || 1
    }));
  });

  return { questions, errors };
}

/* ---------------- JSON ---------------- */

function fromJson(text) {
  let data;
  try { data = JSON.parse(text); }
  catch (e) { return { questions: [], errors: [`Invalid JSON: ${e.message}`] }; }

  const arr = Array.isArray(data) ? data : (data.questions || data.items || data.data);
  if (!Array.isArray(arr)) return { questions: [], errors: ["JSON must be an array, or an object with a `questions` array."] };

  const errors = [];
  const questions = [];
  arr.forEach((row, i) => {
    const q = row.question ?? row.q ?? row.text ?? row.title;
    if (!q) { errors.push(`Item ${i + 1}: no question text — skipped.`); return; }

    // options may be strings, or objects like {text, correct}
    let opts = row.options ?? row.choices ?? row.answers ?? [];
    let correct = [];

    if (Array.isArray(opts) && opts.length && typeof opts[0] === "object") {
      correct = opts.map((o, j) => (o.correct || o.isCorrect ? j : -1)).filter((j) => j >= 0);
      opts = opts.map((o) => o.text ?? o.option ?? o.value ?? "");
    } else {
      opts = (opts || []).map((o) => String(o));
    }
    if (opts.length < 2) { errors.push(`Item ${i + 1}: needs at least 2 options — skipped.`); return; }

    if (!correct.length) {
      const raw = row.answer ?? row.correct ?? row.correctAnswer ?? row.key;
      correct = resolveAnswer(Array.isArray(raw) ? raw.join(",") : raw, opts);
    }
    if (!correct.length) errors.push(`Item ${i + 1}: couldn't resolve the correct answer — defaulted to first option.`);

    questions.push(mkQuestion({
      question: q,
      options: opts,
      correctIdx: correct.length ? correct : [0],
      explanation: row.explanation ?? row.reason ?? "",
      points: row.points ?? row.marks ?? 1
    }));
  });
  return { questions, errors };
}

/* ---------------- Aiken (Moodle plain text) ---------------- */
// What most teachers' exports look like:
//   What is 2+2?
//   A. 3
//   B. 4
//   ANSWER: B

function fromAiken(text) {
  const lines = text.split(/\r?\n/);
  const questions = [];
  const errors = [];
  let q = null, opts = [], ansIdx = null;

  const flush = (lineNo) => {
    if (!q) return;
    if (opts.length < 2) { errors.push(`Question near line ${lineNo}: fewer than 2 options — skipped.`); }
    else {
      if (ansIdx == null) errors.push(`"${q.slice(0, 40)}…": no ANSWER line — defaulted to A.`);
      questions.push(mkQuestion({ question: q, options: opts, correctIdx: ansIdx ?? 0 }));
    }
    q = null; opts = []; ansIdx = null;
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;

    const ans = line.match(/^ANSWER\s*[::]\s*([A-Ja-j])/i);
    if (ans) { ansIdx = LETTERS.indexOf(ans[1].toUpperCase()); flush(i + 1); return; }

    const opt = line.match(/^([A-Ja-j])[.)]\s+(.*)$/);
    if (opt && q) { opts.push(opt[2]); return; }

    // a new question starts once we've already collected options
    if (opts.length) flush(i + 1);
    q = q && !opts.length ? `${q} ${line}` : line;
  });
  flush(lines.length);

  return { questions, errors };
}

/* ---------------- GIFT (Moodle) ---------------- */
// What is 2+2? { =4 ~3 ~5 }

function fromGift(text) {
  const questions = [];
  const errors = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const q = m[1].replace(/^\s*::.*?::/, "").trim();
    const body = m[2];
    if (!q) continue;
    const opts = [];
    let correct = [];
    const optRe = /([=~])\s*([^=~#]+)(?:#([^=~]*))?/g;
    let o;
    while ((o = optRe.exec(body)) !== null) {
      const text2 = o[2].trim();
      if (!text2) continue;
      if (o[1] === "=") correct.push(opts.length);
      opts.push(text2);
    }
    if (opts.length < 2) { errors.push(`"${q.slice(0, 40)}…": fewer than 2 options — skipped.`); continue; }
    if (!correct.length) { errors.push(`"${q.slice(0, 40)}…": no = marked answer — defaulted to first.`); correct = [0]; }
    questions.push(mkQuestion({ question: q, options: opts, correctIdx: correct }));
  }
  return { questions, errors };
}


/* ---------------- DOC (Word / Google Docs / PDF / plain text) ---------------- */
// The forgiving "just type it" format. Every one of these works:
//
//   1. What is 2 + 2?            Q1) What is 2 + 2?        Question 1: …
//   a) 3                         (a) 3                     A. 3
//   b) 4 *        <- * ✓ ✔ or "(correct)" marks the answer
//   Answer: b                    Ans - B    Correct: 4    Answer: A, C (multi)
//   Explanation: 2 + 2 = 4       Solution: …
//   Marks: 2                     Points: 2
//
// Options may also sit on one line:  a) 3   b) 4   c) 5   d) 6
// Questions don't even need numbers if a blank line separates them.

const Q_START = /^(?:q(?:uestion)?\s*(?:no\.?)?\s*)?(\d{1,3})\s*[.):\-–]\s*(.*)$/i;
const Q_WORD = /^q(?:uestion)?\s*[.:\-–]\s*(.+)$/i;
const OPT = /^(?:\(\s*([a-jA-J])\s*\)|([a-jA-J])\s*[.)\]:\-–])\s*(.*)$/;
const ANS = /^(?:correct\s*(?:answer|option)?|ans(?:wer)?|key|right\s*answer|सही\s*उत्तर|उत्तर)\s*[:\-–.=)]?\s*(.+)$/i;
const EXPL = /^(?:explanation|explain|solution|sol|reason|hint|व्याख्या)\s*[:\-–.]\s*(.*)$/i;
const MARKS = /^(?:marks?|points?|score)\s*[:\-–=]\s*(\d+(?:\.\d+)?)/i;
const CORRECT_MARK = /\s*(?:\*+|✓|✔|☑|\(correct\)|\[correct\]|\(right\))\s*$/i;
const LEAD_MARK = /^\s*(?:\*+|✓|✔)\s*/;

/** "a) 3   b) 4   c) 5" -> ["a) 3", "b) 4", "c) 5"] */
function splitInlineOptions(line) {
  const parts = line.split(/\s{2,}|\t+|\s+(?=\(?[a-jA-J][.)]\s)/).map((x) => x.trim()).filter(Boolean);
  return parts.length > 1 && parts.every((p) => OPT.test(p)) ? parts : [line];
}

function fromDoc(text) {
  const raw = String(text || "").replace(/\r/g, "").split("\n").map((l) => l.replace(/^[\s••●▪◦\-]+(?=\S)/, (m) => (/[-]/.test(m) && m.trim() === "-" ? m : "")).trim());
  const questions = [];
  const errors = [];
  let cur = null;
  let last = null; // "q" | "opt" | "expl"
  let blankSinceOpts = false;

  const flush = () => {
    if (!cur) return;
    const label = `"${cur.q.slice(0, 40)}${cur.q.length > 40 ? "…" : ""}"`;
    if (!cur.q) { cur = null; return; }
    // Unnumbered text with no options = a title/instructions line, not a question.
    if (!cur.numbered && cur.opts.length === 0) { cur = null; return; }
    if (cur.opts.length < 2) { errors.push(`${label}: fewer than 2 options — skipped.`); cur = null; return; }
    let correct = cur.opts.map((o, i) => (o.mark ? i : -1)).filter((i) => i >= 0);
    if (cur.answer) {
      const byKey = resolveAnswer(cur.answer.replace(/[()[\]]/g, "").replace(/^option\s*/i, ""), cur.opts.map((o) => o.text));
      if (byKey.length) correct = byKey;
      else if (!correct.length) errors.push(`${label}: couldn't match answer "${cur.answer}" — defaulted to the first option, please check.`);
    } else if (!correct.length) {
      errors.push(`${label}: no answer given — defaulted to the first option, please check.`);
    }
    questions.push(mkQuestion({
      question: cur.q,
      options: cur.opts.map((o) => o.text),
      correctIdx: correct.length ? correct : [0],
      explanation: cur.expl,
      points: cur.points || 1
    }));
    cur = null;
  };
  const start = (q, numbered = false) => { flush(); cur = { q: q || "", opts: [], answer: "", expl: "", points: 0, numbered }; last = "q"; blankSinceOpts = false; };

  for (const line0 of raw) {
    if (!line0) { if (cur?.opts.length) blankSinceOpts = true; continue; }

    let m;
    if ((m = line0.match(ANS)) && cur) { cur.answer = m[1].trim(); last = "ans"; continue; }
    if ((m = line0.match(EXPL)) && cur) { cur.expl = m[1].trim(); last = "expl"; continue; }
    if ((m = line0.match(MARKS)) && cur) { cur.points = Number(m[1]); continue; }

    // A numbered line is a new question — unless we're mid-question with no
    // options yet and the number is clearly part of the text (rare; skip).
    if ((m = line0.match(Q_START)) && !(cur && cur.opts.length === 0 && last === "q" && !m[2])) {
      start(m[2].trim(), true);
      continue;
    }
    if ((m = line0.match(Q_WORD))) { start(m[1].trim(), true); continue; }

    const pieces = splitInlineOptions(line0);
    if (cur && pieces.every((p) => OPT.test(p)) && (cur.q || cur.opts.length)) {
      // An "A." line after a finished question + blank line, with no numbers
      // in the doc, still belongs to the current question.
      for (const p of pieces) {
        const om = p.match(OPT);
        let t = (om[3] || "").trim();
        let mark = false;
        if (CORRECT_MARK.test(t)) { mark = true; t = t.replace(CORRECT_MARK, "").trim(); }
        if (LEAD_MARK.test(t)) { mark = true; t = t.replace(LEAD_MARK, "").trim(); }
        cur.opts.push({ text: t, mark });
      }
      last = "opt"; blankSinceOpts = false;
      continue;
    }

    // Plain text line.
    if (!cur) { start(line0); continue; }
    if (cur.opts.length && (blankSinceOpts || last === "ans")) { start(line0); continue; } // un-numbered next question
    if (last === "expl") { cur.expl += `\n${line0}`; continue; }
    if (cur.opts.length && last === "opt") { const o = cur.opts[cur.opts.length - 1]; o.text = `${o.text} ${line0}`.trim(); continue; }
    cur.q = cur.q ? `${cur.q}\n${line0}` : line0;
  }
  flush();

  if (!questions.length && !errors.length) errors.push("No questions found. Number each question (1., 2., …) and letter its options (a), b), …).");
  return { questions, errors };
}

/* ---------------- sniffer ---------------- */

/** Guess the format so the teacher doesn't have to pick one. */
export function detectFormat(text) {
  const t = (text || "").trim();
  if (!t) return "empty";
  if (/^[[{]/.test(t)) return "json";
  if (/\{[^{}]*[=~][^{}]*\}/.test(t)) return "gift";
  // Numbered questions + lettered options = the Word/Google-Doc format.
  const lines = t.split(/\r?\n/).map((l) => l.trim());
  const firstLine0 = lines[0] || "";
  const looksDelimited = (firstLine0.match(/,/g) || []).length >= 3 || firstLine0.includes("\t");
  if (!looksDelimited) {
    const qCount = lines.filter((l) => Q_START.test(l) || Q_WORD.test(l)).length;
    const optCount = lines.filter((l) => OPT.test(l)).length;
    if (qCount >= 1 && optCount >= 2) return "doc";
    if (/^(?:ans(?:wer)?|correct)\s*[:\-–]/im.test(t) && optCount >= 2 && !/^ANSWER\s*[:：]\s*[A-J]\s*$/m.test(t)) return "doc";
  }
  if (/^ANSWER\s*[::]/im.test(t)) return "aiken";
  const firstLine = t.split(/\r?\n/)[0] || "";
  if (firstLine.includes("\t")) return "tsv";
  if (firstLine.includes(",")) return "csv";
  if (/^[A-Ja-j][.)]\s+/m.test(t)) return "aiken";
  return "csv";
}

/**
 * Parse a question bank of any supported format.
 * @returns {{questions: object[], errors: string[], format: string, truncated: boolean}}
 */
export function parseQuestions(text, format = "auto") {
  const fmt = format === "auto" ? detectFormat(text) : format;
  if (fmt === "empty") return { questions: [], errors: ["Nothing to import."], format: fmt, truncated: false };

  let res;
  switch (fmt) {
    case "json":  res = fromJson(text); break;
    case "gift":  res = fromGift(text); break;
    case "aiken": res = fromAiken(text); break;
    case "doc":   res = fromDoc(text); break;
    case "tsv":   res = fromDelimited(text, "\t"); break;
    default:      res = fromDelimited(text, ","); break;
  }

  let { questions, errors } = res;
  let truncated = false;
  if (questions.length > MAX_QUESTIONS) {
    questions = questions.slice(0, MAX_QUESTIONS);
    truncated = true;
    errors = [...errors, `Only the first ${MAX_QUESTIONS} questions were imported.`];
  }
  return { questions, errors, format: fmt, truncated };
}

/** A ready-to-fill CSV template for teachers who have nothing yet. */
export const CSV_TEMPLATE =
  "question,optionA,optionB,optionC,optionD,answer,explanation\n" +
  '"What is 2 + 2?",3,4,5,6,B,"2 + 2 = 4"\n' +
  '"Capital of India?","Mumbai","New Delhi","Kolkata","Chennai",B,"New Delhi is the capital."\n';

/** Sample quiz in the Word / Google Docs format — used for the .docx and .txt templates. */
export const DOC_TEMPLATE = `SuperCreators quiz template — replace these with your own questions.
Rules: number every question, letter every option, then give the answer.
Mark the correct option with * OR write "Answer:" — either works.

1. What is 2 + 2?
a) 3
b) 4
c) 5
d) 6
Answer: b
Explanation: 2 + 2 = 4
Marks: 1

2. Which of these is the capital of India?
a) Mumbai
b) New Delhi *
c) Kolkata
d) Chennai
Explanation: New Delhi has been the capital since 1931.

3. Which of these are prime numbers? (choose all that apply)
a) 2
b) 4
c) 7
d) 9
Answer: a, c
Marks: 2
`;
