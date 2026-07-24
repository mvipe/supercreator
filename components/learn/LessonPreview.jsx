"use client";
import { useState } from "react";
import SecureVideo from "@/components/learn/SecureVideo";
import SecureNotes from "@/components/learn/SecureNotes";

// =============================================================
// LessonPreview — the "Free preview" modal on the public course page.
//
// It used to only understand `videoUrl`, so a quiz or notes lesson with free
// preview switched ON fell through to "No video attached to this lesson yet."
// even though the toggle was working correctly. Every lesson type now renders
// something real.
// =============================================================

const TYPE_LABEL = {
  video: "Video", audio: "Audio", text: "Reading",
  quiz: "Quiz", assignment: "Assignment", notes: "Notes"
};

export default function LessonPreview({ lesson, courseId, accent = "#2E6EF7", onClose }) {
  const type = lesson.type || "video";
  const title = type === "quiz" ? lesson.quizTitle || lesson.title : lesson.title;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <span className="min-w-0 truncate text-sm font-bold">
            {title || "Lesson"}
            <span className="ml-2 font-normal text-inkmuted">{TYPE_LABEL[type] || type} · Free preview</span>
          </span>
          <button onClick={onClose} className="shrink-0 text-inkmuted hover:text-ink" aria-label="Close">✕</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Body lesson={lesson} type={type} courseId={courseId} accent={accent} />
        </div>
      </div>
    </div>
  );
}

function Body({ lesson, type, courseId, accent }) {
  if (type === "quiz") return <div className="p-4"><QuizPreview lesson={lesson} accent={accent} /></div>;

  if (type === "notes") {
    return <div className="px-4 pb-4"><SecureNotes lesson={lesson} courseId={courseId} accent={accent} /></div>;
  }

  if (type === "text") {
    return (
      <div className="p-5">
        {lesson.text
          ? <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{lesson.text}</p>
          : <p className="text-sm text-inkmuted">This lesson has no content yet.</p>}
      </div>
    );
  }

  if (type === "assignment") {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-line bg-paper p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-inkmuted">Assignment</div>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">
            {lesson.prompt || lesson.text || "The instructor will share the brief here."}
          </p>
        </div>
        <p className="mt-3 text-sm text-inkmuted">Enrol to submit your work and get it reviewed.</p>
      </div>
    );
  }

  if (type === "audio") {
    return (
      <div className="p-5">
        {lesson.audioUrl
          ? <audio src={lesson.audioUrl} controls controlsList="nodownload" className="w-full" />
          : <p className="text-sm text-inkmuted">No audio attached to this lesson yet.</p>}
        {lesson.text && <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{lesson.text}</p>}
      </div>
    );
  }

  // video
  return <div className="px-4 pb-4"><SecureVideo lesson={lesson} courseId={courseId} accent={accent} /></div>;
}

/**
 * Playable quiz taster: answer every question, then see a score summary on
 * completion. It's a sales page, so nothing is saved — but the learner gets the
 * full "take the quiz and see how you did" experience.
 */
function QuizPreview({ lesson, accent }) {
  const questions = lesson.questions || [];
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionIndex]: optionIndex }
  const [finished, setFinished] = useState(false);

  if (!questions.length) {
    return (
      <div className="rounded-xl border border-line bg-paper p-6 text-center">
        <div className="text-3xl">🏅</div>
        <p className="mt-2 text-sm font-semibold">{lesson.quizTitle || lesson.title || "Quiz"}</p>
        <p className="mt-1 text-sm text-inkmuted">The instructor hasn&rsquo;t added questions to this quiz yet.</p>
      </div>
    );
  }

  const isCorrect = (q, pick) => pick != null && (q.options || [])[pick]?.correct;

  // Results screen — shown once the last question is answered and submitted.
  if (finished) {
    const correct = questions.reduce((n, q, idx) => n + (isCorrect(q, answers[idx]) ? 1 : 0), 0);
    const pct = Math.round((correct / questions.length) * 100);
    const pass = pct >= 60;
    return (
      <div className="py-4 text-center">
        <div className="text-4xl">{pass ? "🎉" : "📚"}</div>
        <h3 className="mt-2 font-display text-2xl font-bold">You scored {correct} / {questions.length}</h3>
        <p className="mt-1 text-sm text-inkmuted">{pct}% correct{pass ? " — nicely done!" : " — enrol to master the rest."}</p>
        <div className="mx-auto mt-4 h-2.5 max-w-xs overflow-hidden rounded-full bg-paper">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accent }} />
        </div>

        {/* per-question review */}
        <div className="mt-5 space-y-2 text-left">
          {questions.map((q, idx) => {
            const ok = isCorrect(q, answers[idx]);
            return (
              <div key={q.id || idx} className="flex items-start gap-2.5 rounded-xl border border-line p-3 text-sm">
                <span className={`mt-0.5 shrink-0 font-bold ${ok ? "text-teal" : "text-danger"}`}>{ok ? "✓" : "✕"}</span>
                <span className="min-w-0 flex-1">{q.q || q.question || `Question ${idx + 1}`}</span>
              </div>
            );
          })}
        </div>

        <button onClick={() => { setAnswers({}); setI(0); setFinished(false); }}
          className="btn mt-5 text-sm text-white" style={{ background: accent }}>↻ Try again</button>
      </div>
    );
  }

  const q = questions[i];
  const text = q.q || q.question || "";
  const options = q.options || [];
  const picked = answers[i] ?? null;
  const answered = picked !== null;
  const isLast = i === questions.length - 1;

  const pick = (j) => { if (!answered) setAnswers((a) => ({ ...a, [i]: j })); };
  const next = () => { if (isLast) setFinished(true); else setI((v) => v + 1); };
  const prev = () => setI((v) => Math.max(v - 1, 0));

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-inkmuted">
        <span>Question {i + 1} of {questions.length}</span>
        <span className="rounded-full bg-paper px-2 py-0.5 font-semibold">Practice quiz</span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper">
        <div className="h-full rounded-full transition-all" style={{ width: `${((i + 1) / questions.length) * 100}%`, background: accent }} />
      </div>

      <div className="mt-4 font-display text-lg font-bold">{text}</div>
      {q.image && <img src={q.image} alt="" className="mt-3 max-h-52 rounded-xl object-contain" />}

      <div className="mt-4 space-y-2">
        {options.map((o, j) => {
          const isPicked = picked === j;
          const show = answered && (o.correct || isPicked);
          const good = o.correct;
          return (
            <button key={o.id || j} onClick={() => pick(j)} disabled={answered}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors ${
                show ? (good ? "border-teal bg-teal-soft" : "border-danger bg-red-50") : "border-line hover:border-brand/50"
              } ${answered ? "cursor-default" : ""}`}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line text-xs font-bold">
                {String.fromCharCode(65 + j)}
              </span>
              <span className="min-w-0 flex-1">{o.text}</span>
              {show && <span className="shrink-0 text-sm font-bold">{good ? "✓" : "✕"}</span>}
            </button>
          );
        })}
      </div>

      {answered && q.explanation && (
        <div className="mt-3 rounded-xl bg-paper p-3 text-sm text-inkmuted">💡 {q.explanation}</div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <button onClick={prev} disabled={i === 0} className="btn-ghost text-sm disabled:opacity-40">← Previous</button>
        {answered
          ? <button onClick={next} className="btn text-sm text-white" style={{ background: accent }}>
              {isLast ? "See results →" : "Next question →"}
            </button>
          : <span className="text-xs text-inkmuted">Pick an answer to see the solution</span>}
      </div>
    </div>
  );
}