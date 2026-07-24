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

/* ---------------- sniffer ---------------- */

/** Guess the format so the teacher doesn't have to pick one. */
export function detectFormat(text) {
  const t = (text || "").trim();
  if (!t) return "empty";
  if (/^[[{]/.test(t)) return "json";
  if (/\{[^{}]*[=~][^{}]*\}/.test(t)) return "gift";
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
