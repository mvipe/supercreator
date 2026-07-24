"use client";
import { useState } from "react";
import { uid } from "@/lib/courseModel";
import { Field } from "@/components/ui";

export default function QuizTab({ course, patch }) {
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [formData, setFormData] = useState(null);
  const [expandedQuestions, setExpandedQuestions] = useState({});

  const quizzes = course.modules?.filter((m) => m.type === "quiz") || [];

  const addQuiz = () => {
    // Start with no questions — the creator adds the first one deliberately
    // instead of the form opening with a pre-made blank question.
    setFormData({
      id: uid(),
      title: "New Quiz",
      type: "quiz",
      description: "",
      timeLimit: 0,
      shuffleQuestions: false,
      showAnswers: true,
      questions: []
    });
    setExpandedQuestions({});
    setShowQuizForm(true);
    setEditingQuizId(null);
  };

  const editQuiz = (quiz) => {
    const normalizedQuestions = (quiz.questions || []).map((q) => ({
      ...q,
      type: q.type || "single-choice",
      options: q.options || [],
      correctAnswer: q.correctAnswer ?? (q.correctAnswers?.[0] ?? 0),
      correctAnswers: q.correctAnswers || []
    }));

    setFormData({ ...quiz, questions: normalizedQuestions });
    setExpandedQuestions(Object.fromEntries(normalizedQuestions.map((q) => [q.id, true])));
    setEditingQuizId(quiz.id);
    setShowQuizForm(true);
  };

  const updateQuestion = (idx, patchData) => {
    setFormData((prev) => (
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q, i) => (i === idx ? { ...q, ...patchData } : q))
          }
        : prev
    ));
  };

  const updateOption = (idx, oidx, patchData) => {
    setFormData((prev) => (
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q, i) =>
              i === idx
                ? {
                    ...q,
                    options: q.options.map((opt, j) => (j === oidx ? (typeof patchData === "function" ? patchData(opt) : patchData) : opt))
                  }
                : q
            )
          }
        : prev
    ));
  };

  const addOption = (idx) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q, i) =>
              i === idx ? { ...q, options: [...(q.options || []), `Option ${((q.options || []).length || 0) + 1}`] } : q
            )
          }
        : prev
    );
  };

  const removeOption = (idx, oidx) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q, i) => {
              if (i !== idx) return q;

              const nextOptions = (q.options || []).filter((_, j) => j !== oidx);
              const shiftedCorrectAnswers = (q.correctAnswers || [])
                .filter((answer) => answer !== oidx)
                .map((answer) => (answer > oidx ? answer - 1 : answer));

              return {
                ...q,
                options: nextOptions,
                correctAnswer: q.type === "single-choice" && typeof q.correctAnswer === "number" && q.correctAnswer > oidx ? q.correctAnswer - 1 : q.correctAnswer,
                correctAnswers: q.type === "multiple-choice" ? shiftedCorrectAnswers : []
              };
            })
          }
        : prev
    );
  };

  const toggleQuestion = (questionId) => {
    setExpandedQuestions((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const saveQuiz = () => {
    if (!formData) return;

    let updated = course.modules;
    if (editingQuizId) {
      updated = updated.map((m) => (m.id === editingQuizId ? formData : m));
    } else {
      updated = [...updated, formData];
    }

    patch({ modules: updated });
    setShowQuizForm(false);
    setFormData(null);
    setExpandedQuestions({});
    setEditingQuizId(null);
  };

  const deleteQuiz = (id) => {
    patch({ modules: course.modules.filter((m) => m.id !== id) });
  };

  if (showQuizForm && formData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Create Quiz</h2>
          <button onClick={() => { setShowQuizForm(false); setFormData(null); setExpandedQuestions({}); }} className="text-inkmuted hover:text-ink">✕</button>
        </div>

        <Field label="Quiz Title" required>
          <input className="input" value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
        </Field>

        <Field label="Quiz Description">
          <textarea className="input min-h-20" value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Time Limit (minutes)">
            <input type="number" className="input" value={formData.timeLimit || 0} onChange={(e) => setFormData({ ...formData, timeLimit: parseInt(e.target.value) || 0 })} />
          </Field>
          <Field label="Options">
            <select className="input" value={formData.shuffleQuestions ? "shuffle" : "normal"} onChange={(e) => setFormData({ ...formData, shuffleQuestions: e.target.value === "shuffle" })}>
              <option value="normal">Normal order</option>
              <option value="shuffle">Shuffle questions</option>
            </select>
          </Field>
        </div>

        <div className="rounded-lg border border-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display font-bold">Questions ({formData.questions?.length || 0})</h3>
            <span className="text-xs text-inkmuted">Use the toggle to hide/show answer options</span>
          </div>

          <div className="space-y-3">
            {formData.questions?.map((q, idx) => {
              const isExpanded = expandedQuestions[q.id] ?? true;
              return (
                <div key={q.id} className="rounded-lg border border-line/60 bg-paper p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{idx + 1}. {q.question || "Untitled question"}</div>
                      <div className="mt-1 text-[11px] text-inkmuted">{q.type === "multiple-choice" ? "Multiple choice" : "Single choice"}</div>
                    </div>
                    <button type="button" onClick={() => toggleQuestion(q.id)} className="shrink-0 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-brand">
                      {isExpanded ? "Hide options" : "Show options"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-3">
                      <Field label="Question">
                        <input className="input" value={q.question || ""} onChange={(e) => updateQuestion(idx, { question: e.target.value })} />
                      </Field>

                      <Field label="Question type">
                        <select
                          className="input"
                          value={q.type || "single-choice"}
                          onChange={(e) => {
                            const nextType = e.target.value;
                            const nextCorrectAnswer = nextType === "single-choice"
                              ? (q.correctAnswers?.[0] ?? q.correctAnswer ?? 0)
                              : (q.correctAnswers?.[0] ?? q.correctAnswer ?? 0);

                            updateQuestion(idx, {
                              type: nextType,
                              correctAnswer: nextType === "single-choice" ? nextCorrectAnswer : undefined,
                              correctAnswers: nextType === "multiple-choice" ? (q.correctAnswers?.length ? q.correctAnswers : [nextCorrectAnswer]) : []
                            });
                          }}
                        >
                          <option value="single-choice">Single choice</option>
                          <option value="multiple-choice">Multiple choice</option>
                        </select>
                      </Field>

                      <div className="space-y-2">
                        {(q.options || []).map((opt, oidx) => (
                          <div key={oidx} className="flex items-center gap-2 rounded-lg border border-line bg-white p-2">
                            {q.type === "multiple-choice" ? (
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-brand"
                                checked={(q.correctAnswers || []).includes(oidx)}
                                onChange={(e) => {
                                  const current = q.correctAnswers || [];
                                  const next = e.target.checked
                                    ? [...current, oidx]
                                    : current.filter((answer) => answer !== oidx);
                                  updateQuestion(idx, { correctAnswers: next });
                                }}
                              />
                            ) : (
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                className="h-4 w-4 accent-teal"
                                checked={q.correctAnswer === oidx}
                                onChange={() => updateQuestion(idx, { correctAnswer: oidx })}
                              />
                            )}

                            <input
                              className="input flex-1"
                              value={opt}
                              onChange={(e) => updateOption(idx, oidx, e.target.value)}
                            />

                            <button type="button" onClick={() => removeOption(idx, oidx)} className="text-xs font-semibold text-danger">
                              ✕
                            </button>
                          </div>
                        ))}

                        <button type="button" onClick={() => addOption(idx)} className="text-sm font-semibold text-brand">
                          + Add option
                        </button>
                      </div>

                      <Field label="Explanation (optional)">
                        <textarea className="input min-h-20" value={q.explanation || ""} onChange={(e) => updateQuestion(idx, { explanation: e.target.value })} />
                      </Field>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={() => {
            const newQ = {
              id: uid(),
              type: "single-choice",
              question: "",
              options: ["Option A", "Option B"],
              correctAnswer: 0,
              correctAnswers: [],
              explanation: ""
            };
            setFormData((prev) => prev ? { ...prev, questions: [...(prev.questions || []), newQ] } : prev);
            setExpandedQuestions((prev) => ({ ...prev, [newQ.id]: true }));
          }} className="btn btn-ghost mt-3 w-full">
            + Add Question
          </button>
        </div>

        <div className="flex gap-3">
          <button onClick={saveQuiz} className="btn btn-brand flex-1">Save Quiz</button>
          <button onClick={() => { setShowQuizForm(false); setFormData(null); setExpandedQuestions({}); }} className="btn btn-ghost flex-1">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Quizzes</h2>
        <p className="text-sm text-inkmuted">Create quizzes to test your students</p>
      </div>

      {quizzes.length > 0 ? (
        <div className="space-y-2">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="flex items-center justify-between rounded-lg border border-line p-4">
              <div>
                <div className="font-medium">{quiz.title}</div>
                <div className="text-xs text-inkmuted">{quiz.questions?.length || 0} questions {quiz.timeLimit ? `· ${quiz.timeLimit} min` : ""}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => editQuiz(quiz)} className="btn btn-ghost btn-sm">Edit</button>
                <button onClick={() => deleteQuiz(quiz.id)} className="btn btn-ghost btn-sm text-danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line p-8 text-center">
          <p className="text-sm text-inkmuted">No quizzes yet</p>
        </div>
      )}

      <button onClick={addQuiz} className="btn btn-brand">+ Create Quiz</button>
    </div>
  );
}
