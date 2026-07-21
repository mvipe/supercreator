"use client";
import { useEffect, useState } from "react";
import { LatexText } from "@/components/editor/LatexRenderer";

const TIMER_OPTIONS = [
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
  { value: 600, label: "10 minutes" },
  { value: 900, label: "15 minutes" },
  { value: 1800, label: "30 minutes" },
  { value: 3600, label: "1 hour" },
];

export default function QuizModal({ lesson, accent, onClose }) {
  const questions = lesson.questions || [];
  const [step, setStep] = useState("start"); // start | setup | quiz
  const [mode, setMode] = useState("quiz"); // quiz | test
  const [useTimer, setUseTimer] = useState(false);
  const [timerDuration, setTimerDuration] = useState(300);
  const [timeLeft, setTimeLeft] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (step !== "quiz" || !useTimer || submitted) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setSubmitted(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, useTimer, submitted]);

  // Initialize timer when quiz starts
  useEffect(() => {
    if (step === "quiz" && useTimer && timeLeft === null) {
      setTimeLeft(timerDuration);
    }
  }, [step, useTimer, timerDuration, timeLeft]);

  const score = questions.reduce((n, q) => {
    const chosen = answers[q.id];
    if (q.type === "multiple") {
      const correctIds = q.options.filter((o) => o.correct).map((o) => o.id);
      const chosenIds = Array.isArray(chosen) ? chosen : [];
      const allCorrect = correctIds.length > 0 && correctIds.every((id) => chosenIds.includes(id));
      const onlyCorrect = chosenIds.every((id) => correctIds.includes(id));
      return n + (allCorrect && onlyCorrect ? 1 : 0);
    }
    const correct = q.options.find((o) => o.correct);
    return n + (chosen && correct && chosen === correct.id ? 1 : 0);
  }, 0);

  const percentage = Math.round((score / questions.length) * 100);
  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const timeWarning = useTimer && timeLeft !== null && timeLeft < 60;

  const resetQuiz = () => {
    setAnswers({});
    setSubmitted(false);
    setCurrentIndex(0);
    setShowFeedback(false);
    setTimeLeft(null);
  };

  const startQuiz = () => {
    resetQuiz();
    if (useTimer) {
      setStep("setup");
    } else {
      setStep("quiz");
    }
  };

  // Start quiz - show timer setup
  if (step === "start") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand/10 to-teal/10 p-6 border-b border-line">
            <div className="text-3xl mb-2">🎯</div>
            <h2 className="font-display text-2xl font-bold text-ink">Choose your quiz mode</h2>
            <p className="text-sm text-inkmuted mt-1">{questions.length} questions</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="grid gap-3">
              <button
                onClick={() => setMode("quiz")}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${mode === "quiz" ? "border-brand bg-brand/10 shadow-sm" : "border-line bg-white hover:border-brand/40"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚡</div>
                  <div>
                    <div className="font-semibold text-ink">Quiz format</div>
                    <div className="text-xs text-inkmuted mt-0.5">Answer one question at a time and see right away if you were correct.</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setMode("test")}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${mode === "test" ? "border-brand bg-brand/10 shadow-sm" : "border-line bg-white hover:border-brand/40"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🧠</div>
                  <div>
                    <div className="font-semibold text-ink">Test format</div>
                    <div className="text-xs text-inkmuted mt-0.5">Answer all questions first, then review your results at the end.</div>
                  </div>
                </div>
              </button>
            </div>

            <div className="rounded-xl border border-line bg-paper p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-ink">Timer</div>
                  <div className="text-xs text-inkmuted">Use a countdown timer for the entire quiz.</div>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-inkmuted">
                  <input type="checkbox" checked={useTimer} onChange={(e) => setUseTimer(e.target.checked)} className="h-4 w-4 accent-brand" />
                  Enable timer
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-line p-4 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={startQuiz}
              className="flex-1 btn btn-brand"
            >
              Start {mode === "quiz" ? "Quiz" : "Test"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Setup timer duration
  if (step === "setup") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand/10 to-teal/10 p-6 border-b border-line">
            <div className="text-3xl mb-2">⏳</div>
            <h2 className="font-display text-2xl font-bold text-ink">Set Time Limit</h2>
            <p className="text-sm text-inkmuted mt-1">How much time do you want?</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {TIMER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTimerDuration(opt.value)}
                  className={`rounded-lg border-2 p-3 text-sm font-semibold transition-all ${
                    timerDuration === opt.value
                      ? "border-brand bg-brand text-white shadow-md"
                      : "border-line bg-white hover:border-brand/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div className="rounded-xl bg-paper p-4 text-center">
              <div className="text-xs font-semibold text-inkmuted uppercase tracking-wide mb-2">Time Limit</div>
              <div className="font-display text-3xl font-bold text-brand">{formatTime(timerDuration)}</div>
            </div>

            <p className="text-xs text-inkmuted text-center">
              Once you start, the timer will count down. You can submit anytime or it will auto-submit when time's up.
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-line p-4 flex gap-2">
            <button
              onClick={() => setStep("start")}
              className="flex-1 btn-ghost"
            >
              Back
            </button>
            <button
              onClick={() => setStep("quiz")}
              className="flex-1 btn btn-brand"
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz view
  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.reduce((count, q) => {
    const ans = answers[q.id];
    if (q.type === "multiple") return count + (Array.isArray(ans) && ans.length > 0 ? 1 : 0);
    return count + (ans ? 1 : 0);
  }, 0);

  const optionSelected = (q, optionId) => {
    if (q.type === "multiple") {
      const current = Array.isArray(answers[q.id]) ? answers[q.id] : [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      setAnswers({ ...answers, [q.id]: next });
      if (mode === "quiz" && questions[currentIndex].id === q.id) setShowFeedback(true);
      return;
    }
    setAnswers({ ...answers, [q.id]: optionId });
    if (mode === "quiz" && questions[currentIndex].id === q.id) setShowFeedback(true);
  };

  const currentCorrectIds = currentQuestion?.options.filter((o) => o.correct).map((o) => o.id) || [];
  const currentChosen = answers[currentQuestion?.id];
  const currentIsCorrect = currentQuestion
    ? currentQuestion.type === "multiple"
      ? Array.isArray(currentChosen) && currentCorrectIds.length > 0 && currentCorrectIds.every((id) => currentChosen.includes(id)) && currentChosen.every((id) => currentCorrectIds.includes(id))
      : currentChosen === currentCorrectIds[0]
    : false;

  const showReview = submitted;

  if (step === "quiz") {
    if (questions.length === 0) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6">
            <p className="text-inkmuted">No questions in this quiz yet.</p>
            <button onClick={onClose} className="btn btn-brand mt-4">Close</button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand/5 to-teal/5 border-b border-line px-6 py-4 flex items-center justify-between sticky top-0 z-10">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">
                {lesson.quizTitle || (mode === "quiz" ? "Quiz" : "Test")}
              </h2>
              <div className="text-xs text-inkmuted mt-1">
                {mode === "quiz"
                  ? `Quiz mode · Question ${currentIndex + 1} of ${questions.length}`
                  : `Test mode · ${questions.length} questions`}
              </div>
              {useTimer && timeLeft !== null && !submitted && (
                <div className={`text-sm font-semibold mt-2 ${timeWarning ? "text-danger" : "text-inkmuted"}`}>
                  ⏱️ Time left: <span className={timeWarning ? "animate-pulse" : ""}>{formatTime(timeLeft)}</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-inkmuted hover:text-ink rounded-lg hover:bg-paper p-2 text-xl transition"
              title="Close quiz"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!showReview ? (
              <div className="space-y-5">
                {mode === "quiz" ? (
                  <div className="rounded-2xl border border-line p-4">
                    <div className="font-semibold text-lg mb-4">
                      <LatexText text={`${currentIndex + 1}. ${currentQuestion.q}`} />
                    </div>
                    {currentQuestion.image && <img src={currentQuestion.image} alt="" className="mt-3 max-h-56 rounded-xl border border-line" />}
                    <div className="mt-3 space-y-2">
                      {currentQuestion.options.map((o) => {
                        const chosen = answers[currentQuestion.id];
                        const isChosen = currentQuestion.type === "multiple"
                          ? Array.isArray(chosen) && chosen.includes(o.id)
                          : chosen === o.id;
                        const correct = o.correct;
                        const showResult = showFeedback && (currentQuestion.type === "multiple" ? isChosen || correct : isChosen || correct);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => optionSelected(currentQuestion, o.id)}
                            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                              isChosen
                                ? "border-brand bg-brand/10 shadow-sm"
                                : "border-line hover:border-brand/40"
                            } ${showFeedback && correct ? "border-teal bg-teal/10" : showFeedback && isChosen && !correct ? "border-red-200 bg-red-50" : ""}`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                isChosen ? "border-brand" : "border-line"
                              }`}
                            >
                              {isChosen && (
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ background: accent }}
                                />
                              )}
                            </span>
                            {o.image && (
                              <img
                                src={o.image}
                                alt=""
                                className="h-10 w-10 rounded object-cover"
                              />
                            )}
                            <span>
                              <LatexText text={o.text} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {showFeedback && (
                      <div className={`mt-4 rounded-xl p-4 text-sm ${currentIsCorrect ? "bg-teal/10 border border-teal text-teal" : "bg-red-50 border border-red-200 text-danger"}`}>
                        {currentIsCorrect ? "Good job! That answer is correct." : "Oops — that answer is not correct. You'll see the full review at the end."}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {questions.map((q, qi) => {
                      const chosen = answers[q.id];
                      return (
                        <div key={q.id} className="rounded-2xl border border-line p-4">
                          <div className="font-semibold text-lg">
                            <LatexText text={`${qi + 1}. ${q.q}`} />
                          </div>
                          {q.image && <img src={q.image} alt="" className="mt-3 max-h-56 rounded-xl border border-line" />}
                          <div className="mt-3 space-y-2">
                            {q.options.map((o) => {
                              const isChosen = q.type === "multiple"
                                ? Array.isArray(chosen) && chosen.includes(o.id)
                                : chosen === o.id;
                              return (
                                <button
                                  key={o.id}
                                  type="button"
                                  onClick={() => optionSelected(q, o.id)}
                                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                                    isChosen
                                      ? "border-brand bg-brand/10 shadow-sm"
                                      : "border-line hover:border-brand/40"
                                  }`}
                                >
                                  <span
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                      isChosen ? "border-brand" : "border-line"
                                    }`}
                                  >
                                    {isChosen && (
                                      <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{ background: accent }}
                                      />
                                    )}
                                  </span>
                                  {o.image && (
                                    <img
                                      src={o.image}
                                      alt=""
                                      className="h-10 w-10 rounded object-cover"
                                    />
                                  )}
                                  <span>
                                    <LatexText text={o.text} />
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">
                  {percentage === 100 ? "🎉" : percentage >= 70 ? "🎊" : "📚"}
                </div>
                <div className="font-display text-4xl font-bold mb-2">
                  {score} / {questions.length}
                </div>
                <div className="text-lg text-inkmuted mb-1">
                  {percentage}%
                </div>
                <p className="text-sm text-inkmuted mb-6">
                  {percentage === 100
                    ? "Perfect! You mastered this quiz! 🏆"
                    : percentage >= 70
                      ? "Great job! You passed! 👏"
                      : "Review the material and try again."}
                </p>

                {/* Answer Review */}
                <div className="mt-8 text-left space-y-3">
                  <div className="text-sm font-bold text-ink mb-3">Answer Review:</div>
                  {questions.map((q, qi) => {
                    const chosen = answers[q.id];
                    const correctIds = q.options.filter((o) => o.correct).map((o) => o.id);
                    const isCorrect = q.type === "multiple"
                      ? Array.isArray(chosen) && correctIds.length > 0 && correctIds.every((id) => chosen.includes(id)) && chosen.every((id) => correctIds.includes(id))
                      : chosen === correctIds[0];
                    return (
                      <div key={q.id} className={`rounded-lg border-2 p-3 ${
                        isCorrect ? "border-teal bg-teal/5" : "border-red-200 bg-red-50"
                      }`}>
                        <div className="flex items-start gap-2">
                          <div className={`mt-0.5 text-lg ${isCorrect ? "text-teal" : "text-danger"}`}>
                            {isCorrect ? "✓" : "✕"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-ink">{qi + 1}. <LatexText text={q.q} /></div>
                            <div className="mt-2 text-xs text-inkmuted">
                              <div>Your answer: <span className="font-semibold text-ink">{
                                q.type === "multiple"
                                  ? (Array.isArray(chosen) && chosen.length > 0 ? q.options.filter((o) => chosen.includes(o.id)).map((o) => o.text).join(", ") : "Not answered")
                                  : q.options.find((o) => o.id === chosen)?.text || "Not answered"
                              }</span></div>
                              <div className="mt-1">Correct answer: <span className="font-semibold text-teal">{
                                q.type === "multiple"
                                  ? q.options.filter((o) => correctIds.includes(o.id)).map((o) => o.text).join(", ")
                                  : q.options.find((o) => o.id === correctIds[0])?.text || "Not set"
                              }</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-line p-4 bg-white sticky bottom-0 flex gap-2">
            {!submitted ? (
              <>
                {mode === "quiz" ? (
                  <>
                    <button
                      onClick={onClose}
                      className="flex-1 btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setShowFeedback(false);
                        if (currentIndex === questions.length - 1) {
                          setSubmitted(true);
                        } else {
                          setCurrentIndex((idx) => idx + 1);
                        }
                      }}
                      disabled={!showFeedback}
                      className="flex-1 btn text-white disabled:opacity-50"
                      style={{ background: showFeedback ? accent : "#ccc" }}
                    >
                      {currentIndex === questions.length - 1 ? "Finish" : "Next question"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={onClose}
                      className="flex-1 btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setSubmitted(true)}
                      disabled={answeredCount < questions.length}
                      className="flex-1 btn text-white disabled:opacity-50"
                      style={{ background: answeredCount < questions.length ? "#ccc" : accent }}
                    >
                      Submit Quiz ({answeredCount}/{questions.length})
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    resetQuiz();
                    setStep("start");
                  }}
                  className="flex-1 btn-ghost"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 btn text-white"
                  style={{ background: accent }}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
}
