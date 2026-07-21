import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabaseAdmin";
import { spendCredits, refundCredits, logUsage, getBalance } from "@/lib/aiCredits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_PER_CALL = 50; // keeps one request inside the token + time budget

const SYSTEM = `You are an expert exam-question writer for Indian educators.
Return ONLY valid JSON, no markdown fences, no commentary.

Schema:
{"questions":[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]}

Rules:
- Exactly 4 options per question unless told otherwise.
- Exactly one correct answer; correctIndex is 0-based.
- Options must be plausible and mutually exclusive; no "All of the above" unless asked.
- Vary correctIndex across questions — do NOT always use 0.
- explanation: one short sentence saying why the answer is right.
- Never repeat a question.
- Match the requested difficulty and language.`;

/** Strip ``` fences some models still add, then parse. */
function parseJson(text) {
  const cleaned = String(text || "").replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

export async function POST(req) {
  let debited = 0;
  let user = null;

  try {
    user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "AI is not configured. Add OPENAI_API_KEY to your environment." }, { status: 500 });
    }

    const body = await req.json();
    const topic = String(body.topic || "").trim();
    const count = Math.min(Math.max(parseInt(body.count, 10) || 10, 1), MAX_PER_CALL);
    const difficulty = ["easy", "medium", "hard", "mixed"].includes(body.difficulty) ? body.difficulty : "medium";
    const language = String(body.language || "English").slice(0, 40);
    const context = String(body.context || "").slice(0, 6000); // pasted notes/syllabus

    if (!topic && !context) {
      return NextResponse.json({ error: "Give a topic, or paste some material to build questions from." }, { status: 400 });
    }

    // ---- charge first, atomically ----
    const balance = await spendCredits(user.id, count);
    if (balance < 0) {
      const have = await getBalance(user.id);
      return NextResponse.json({
        error: `Not enough credits. You need ${count} but have ${have}.`,
        code: "INSUFFICIENT_CREDITS",
        balance: have,
        needed: count
      }, { status: 402 });
    }
    debited = count;

    const prompt = [
      `Write ${count} multiple-choice questions.`,
      topic ? `Topic: ${topic}` : null,
      `Difficulty: ${difficulty}`,
      `Language: ${language}`,
      context ? `Base them strictly on this material:\n"""\n${context}\n"""` : null
    ].filter(Boolean).join("\n");

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 55000);

    let res;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.8,
          max_tokens: Math.min(16000, 320 * count + 500)
        })
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      let msg = `AI request failed (${res.status}).`;
      if (res.status === 401) msg = "OpenAI rejected the API key.";
      else if (res.status === 429) msg = "OpenAI rate limit or quota reached. Try again shortly.";
      throw new Error(`${msg} ${detail.slice(0, 180)}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error("AI returned an empty response.");

    let parsed;
    try { parsed = parseJson(raw); }
    catch { throw new Error("AI returned malformed JSON. Please try again."); }

    const list = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(list) || !list.length) throw new Error("AI returned no questions.");

    // ---- validate before we hand anything to the editor ----
    const questions = [];
    for (const q of list) {
      const text = String(q.question || "").trim();
      const options = (q.options || []).map((o) => String(o ?? "").trim()).filter(Boolean);
      if (!text || options.length < 2) continue;
      let ci = Number.isInteger(q.correctIndex) ? q.correctIndex : 0;
      if (ci < 0 || ci >= options.length) ci = 0;
      questions.push({
        question: text,
        options,
        correctIndex: ci,
        explanation: String(q.explanation || "").trim()
      });
    }
    if (!questions.length) throw new Error("AI returned no usable questions.");

    // Only charge for what we actually delivered.
    const unused = count - questions.length;
    if (unused > 0) { await refundCredits(user.id, unused); debited -= unused; }

    const finalBalance = await getBalance(user.id);
    await logUsage(user.id, {
      credits: debited,
      model: MODEL,
      meta: { topic, difficulty, count: questions.length, usedContext: !!context }
    });

    return NextResponse.json({
      questions,
      credits: { spent: debited, balance: finalBalance },
      model: MODEL
    });
  } catch (e) {
    // Never take credits for a failed generation.
    if (user && debited > 0) await refundCredits(user.id, debited);
    const aborted = e.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "The AI took too long. Try generating fewer questions at once." : e.message },
      { status: aborted ? 504 : 500 }
    );
  }
}