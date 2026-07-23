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
 * Playable quiz taster: answer questions, see if you're right — but this is a
 * sales page, so nothing is scored or saved.
 */
function QuizPreview({ lesson, accent }) {
  const questions = lesson.questions || [];
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);

  if (!questions.length) {
    return (
      <div className="rounded-xl border border-line bg-paper p-6 text-center">
        <div className="text-3xl">🏅</div>
        <p className="mt-2 text-sm font-semibold">{lesson.quizTitle || lesson.title || "Quiz"}</p>
        <p className="mt-1 text-sm text-inkmuted">The instructor hasn&rsquo;t added questions to this quiz yet.</p>
      </div>
    );
  }

  const q = questions[i];
  const text = q.q || q.question || "";
  const options = q.options || [];
  const answered = picked !== null;

  const next = () => { setPicked(null); setI((v) => Math.min(v + 1, questions.length - 1)); };
  const prev = () => { setPicked(null); setI((v) => Math.max(v - 1, 0)); };

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-inkmuted">
        <span>Question {i + 1} of {questions.length}</span>
        <span className="rounded-full bg-paper px-2 py-0.5 font-semibold">Practice — not scored</span>
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
            <button key={o.id || j} onClick={() => !answered && setPicked(j)} disabled={answered}
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
          ? <button onClick={next} disabled={i === questions.length - 1}
              className="btn text-sm text-white disabled:opacity-40" style={{ background: accent }}>Next question →</button>
          : <span className="text-xs text-inkmuted">Pick an answer to see the solution</span>}
      </div>
    </div>
  );
}