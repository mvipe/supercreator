"use client";
import { useState, useEffect } from "react";
import { uid, uploadImage } from "@/lib/courseModel";
import MathFormulaToolbar from "@/components/editor/MathFormulaToolbar";
import { LatexText } from "@/components/editor/LatexRenderer";
import AiQuizModal from "@/components/editor/AiQuizModal";
import QuizImportModal from "@/components/editor/QuizImportModal";

/**
 * Modern quiz builder modal - inspired by Typeform, Google Forms, Quizlet
 * Provides a creator-friendly interface for building quizzes with single/multiple choice
 */
export default function QuizBuilder({ lesson, onChange, userId, onClose }) {
  const questions = lesson.questions || [];
  const setQuestions = (q) => onChange({ questions: q });
  const [activeQuestionId, setActiveQuestionId] = useState(questions[0]?.id || null);

  const activeQuestion = questions.find((q) => q.id === activeQuestionId);
  const activeIndex = questions.findIndex((q) => q.id === activeQuestionId);
  const questionType = activeQuestion?.type || "single"; // "single" or "multiple"
  const [imageUploading, setImageUploading] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showImport, setShowImport] = useState(false);

  /** Bulk-add questions from the AI generator or an import file. */
  function addQuestions(newOnes, mode = "append") {
    if (!newOnes?.length) return;
    const next = mode === "replace" ? newOnes : [...questions, ...newOnes];
    setQuestions(next);
    setActiveQuestionId(newOnes[0]?.id || next[0]?.id || null);
  }

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const updateQ = (p) => {
    if (!activeQuestion) return;
    setQuestions(
      questions.map((q) => (q.id === activeQuestionId ? { ...q, ...p } : q))
    );
  };

  const updateOpt = (oi, p) => {
    if (!activeQuestion) return;
    updateQ({
      options: activeQuestion.options.map((o, j) => (j === oi ? { ...o, ...p } : o))
    });
  };

  const insertFormula = (formula) => {
    if (!activeQuestion) return;
    updateQ({ q: (activeQuestion.q || "") + formula });
  };

  const insertFormulaInOption = (oi, formula) => {
    if (!activeQuestion) return;
    updateOpt(oi, { text: (activeQuestion.options[oi]?.text || "") + formula });
  };

  const handleQuestionImage = async (file) => {
    if (!file || !userId || !activeQuestion) return;
    setImageUploading(true);
    try {
      const url = await uploadImage(userId, file);
      updateQ({ image: url });
    } catch (error) {
      alert("Failed to upload image: " + error.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleOptionImage = async (oi, file) => {
    if (!file || !userId || !activeQuestion) return;
    setImageUploading(true);
    try {
      const url = await uploadImage(userId, file);
      updateOpt(oi, { image: url });
    } catch (error) {
      alert("Failed to upload image: " + error.message);
    } finally {
      setImageUploading(false);
    }
  };

  const addQuestion = () => {
    const newQ = {
      id: uid(),
      q: "",
      image: "",
      type: "single",
      options: [
        { id: uid(), text: "", image: "", correct: false },
        { id: uid(), text: "", image: "", correct: false }
      ]
    };
    setQuestions([...questions, newQ]);
    setActiveQuestionId(newQ.id);
  };

  const deleteQuestion = () => {
    if (questions.length <= 1) {
      alert("You must have at least one question");
      return;
    }
    const nextQuestions = questions.filter((q) => q.id !== activeQuestionId);
    setQuestions(nextQuestions);
    setActiveQuestionId(nextQuestions[0]?.id || null);
  };

  const moveQuestion = (direction) => {
    const nextIndex = activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= questions.length) return;

    const newQuestions = [...questions];
    [newQuestions[activeIndex], newQuestions[nextIndex]] = [
      newQuestions[nextIndex],
      newQuestions[activeIndex]
    ];
    setQuestions(newQuestions);
  };

  const addOption = () => {
    if (!activeQuestion) return;
    updateQ({
      options: [
        ...activeQuestion.options,
        { id: uid(), text: "", image: "", correct: false }
      ]
    });
  };

  const removeOption = (oi) => {
    if (!activeQuestion || activeQuestion.options.length <= 2) return;
    updateQ({
      options: activeQuestion.options.filter((_, j) => j !== oi)
    });
  };

  if (!activeQuestion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-8 text-center">
          <p className="text-inkmuted">No questions added yet</p>
          <button onClick={addQuestion} className="btn btn-brand mt-4">
            + Create First Question
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* Centered modal container */}
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex bg-white">
        {/* Left sidebar - question list */}
        <div className="w-72 border-r border-line bg-gradient-to-b from-brand/5 to-white overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-line p-4 shadow-sm z-10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">Quiz Questions</h3>
            <p className="text-[11px] text-inkmuted mt-1">{questions.length} questions</p>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button onClick={() => setShowAi(true)}
                className="rounded-lg border border-brand/30 bg-brand/5 px-2 py-1.5 text-[11px] font-bold text-brand hover:bg-brand/10">
                ✨ AI generate
              </button>
              <button onClick={() => setShowImport(true)}
                className="rounded-lg border border-line px-2 py-1.5 text-[11px] font-bold text-inkmuted hover:border-brand hover:text-brand">
                📥 Import
              </button>
            </div>
          </div>
          
          <div className="p-3 space-y-2">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setActiveQuestionId(q.id)}
                className={`w-full rounded-lg border-2 px-3 py-2.5 text-left transition-all ${
                  activeQuestionId === q.id
                    ? "border-brand bg-brand/10 shadow-md"
                    : "border-line bg-white hover:border-brand/40 hover:bg-brand/5"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    activeQuestionId === q.id ? "bg-brand text-white" : "bg-paper text-inkmuted"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-ink truncate">{q.q || "(untitled)"}</div>
                    <div className="text-[10px] text-inkmuted mt-0.5">
                      {q.type === "multiple" ? "✓✓ Multi-choice" : "◯ Single-choice"}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <div className="p-3 border-t border-line sticky bottom-0 bg-white">
            <button onClick={addQuestion} className="btn btn-brand w-full text-xs">
              + New Question
            </button>
          </div>
        </div>

        {/* Right panel - question editor */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-brand/5 to-teal/5 border-b border-line px-6 py-4 flex items-center justify-between z-10 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-ink">Question {activeIndex + 1}</h2>
              <p className="text-xs text-inkmuted mt-0.5">
                {activeQuestion.options?.length} options · 
                {questionType === "multiple" 
                  ? ` ${activeQuestion.options?.filter((o) => o.correct).length} correct answers` 
                  : (activeQuestion.options?.find((o) => o.correct) ? " ✓ Has answer" : " ⚠ No answer yet")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-inkmuted hover:text-ink rounded-lg hover:bg-red-50 p-2 text-xl transition"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            {/* Question Type Selector */}
            <div>
              <label className="block text-sm font-bold mb-3 text-ink">Question Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => updateQ({ type: "single" })}
                  className={`rounded-xl border-2 p-4 text-center transition-all ${
                    questionType === "single"
                      ? "border-brand bg-brand/10 shadow-md"
                      : "border-line bg-white hover:border-brand/40"
                  }`}
                >
                  <div className="text-2xl mb-1">◯</div>
                  <div className={`text-sm font-semibold ${questionType === "single" ? "text-brand" : "text-ink"}`}>
                    Single Choice
                  </div>
                  <div className="text-xs text-inkmuted mt-1">One correct answer</div>
                </button>

                <button
                  onClick={() => updateQ({ type: "multiple" })}
                  className={`rounded-xl border-2 p-4 text-center transition-all ${
                    questionType === "multiple"
                      ? "border-brand bg-brand/10 shadow-md"
                      : "border-line bg-white hover:border-brand/40"
                  }`}
                >
                  <div className="text-2xl mb-1">✓✓</div>
                  <div className={`text-sm font-semibold ${questionType === "multiple" ? "text-brand" : "text-ink"}`}>
                    Multiple Choice
                  </div>
                  <div className="text-xs text-inkmuted mt-1">Multiple correct answers</div>
                </button>
              </div>
            </div>

            {/* Question text */}
            <div>
              <label className="block text-sm font-bold mb-2 text-ink">Question</label>
              <div className="flex gap-2">
                <textarea
                  className="input flex-1 min-h-24 text-sm"
                  placeholder="Write your question here..."
                  value={activeQuestion.q}
                  onChange={(e) => updateQ({ q: e.target.value })}
                />
                <MathFormulaToolbar onInsert={insertFormula} />
              </div>
              <div className="mt-4 rounded-xl border border-line bg-paper p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-ink">Question image</div>
                    <div className="text-xs text-inkmuted">Optional image to illustrate the question.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="btn btn-ghost cursor-pointer text-sm">
                      {imageUploading ? "Uploading…" : activeQuestion.image ? "Replace image" : "Upload image"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleQuestionImage(e.target.files?.[0])} />
                    </label>
                    {activeQuestion.image && (
                      <button type="button" className="text-xs text-danger" onClick={() => updateQ({ image: "" })}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                {activeQuestion.image && (
                  <img src={activeQuestion.image} alt="Question preview" className="mt-3 max-h-52 w-full rounded-xl object-contain border border-line" />
                )}
              </div>
              <div className="mt-2 rounded-lg bg-paper p-3 text-sm border border-line">
                <div className="text-xs font-bold text-inkmuted mb-2">📋 Preview:</div>
                <div className="text-ink">
                  <LatexText text={activeQuestion.q || "(preview)"} />
                </div>
              </div>
            </div>

            {/* Options */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-bold text-ink">Options</label>
                <button onClick={addOption} className="text-xs font-semibold text-brand hover:text-brand/80 transition">
                  + Add option
                </button>
              </div>

              <div className="space-y-2">
                {activeQuestion.options?.map((o, oi) => (
                  <div
                    key={o.id}
                    className={`rounded-xl border-2 p-4 transition-all ${
                      o.correct
                        ? "border-teal bg-teal/5 shadow-sm"
                        : "border-line bg-white hover:border-line/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {questionType === "single" ? (
                        <input
                          type="radio"
                          name={`correct-${activeQuestion.id}`}
                          checked={!!o.correct}
                          onChange={() =>
                            updateQ({
                              options: activeQuestion.options.map((x, j) => ({
                                ...x,
                                correct: j === oi
                              }))
                            })
                          }
                          className="h-5 w-5 shrink-0 accent-teal mt-1 cursor-pointer"
                          title="Mark as correct answer"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={!!o.correct}
                          onChange={() => updateOpt(oi, { correct: !o.correct })}
                          className="h-5 w-5 shrink-0 accent-teal mt-1 cursor-pointer"
                          title="Mark as correct answer"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-2">
                          <input
                            className="input flex-1 text-sm"
                            placeholder={`Option ${oi + 1}`}
                            value={o.text}
                            onChange={(e) => updateOpt(oi, { text: e.target.value })}
                          />
                          <MathFormulaToolbar onInsert={(f) => insertFormulaInOption(oi, f)} />
                          {activeQuestion.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(oi)}
                              className="shrink-0 text-danger hover:bg-red-50 rounded-lg p-2 transition"
                              title="Delete option"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-inkmuted">
                          Preview: <LatexText text={o.text || "(preview)"} />
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                          {o.image ? (
                            <div className="flex items-center gap-3">
                              <img src={o.image} alt="Option preview" className="h-16 w-16 rounded-lg object-cover border border-line" />
                              <button type="button" className="text-xs text-danger" onClick={() => updateOpt(oi, { image: "" })}>
                                Remove image
                              </button>
                            </div>
                          ) : null}
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold text-inkmuted hover:border-brand">
                            {imageUploading ? "Uploading…" : "Upload option image"}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleOptionImage(oi, e.target.files?.[0])} />
                          </label>
                        </div>
                      </div>
                    </div>
                    {o.correct && (
                      <div className="mt-2 text-xs font-semibold text-teal ml-8">
                        {questionType === "multiple" ? "✓ Correct answer" : "✓ This is the correct answer"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-2 pt-6 border-t border-line">
              <button
                onClick={() => moveQuestion(-1)}
                disabled={activeIndex === 0}
                className="btn btn-ghost disabled:opacity-50 text-sm"
                title="Previous question"
              >
                ← Prev
              </button>
              <button
                onClick={() => moveQuestion(1)}
                disabled={activeIndex === questions.length - 1}
                className="btn btn-ghost disabled:opacity-50 text-sm"
                title="Next question"
              >
                Next →
              </button>
              <div className="flex-1" />
              <button 
                onClick={deleteQuestion} 
                className="btn btn-ghost text-danger hover:bg-red-50 text-sm"
                title="Delete this question"
              >
                🗑 Delete
              </button>
              <button onClick={onClose} className="btn btn-brand text-sm">
                ✓ Done
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAi && (
        <AiQuizModal
          defaultTopic={lesson.quizTitle || lesson.title || ""}
          onAdd={(qs) => addQuestions(qs, "append")}
          onClose={() => setShowAi(false)}
        />
      )}
      {showImport && (
        <QuizImportModal
          onAdd={(qs, mode) => addQuestions(qs, mode)}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}