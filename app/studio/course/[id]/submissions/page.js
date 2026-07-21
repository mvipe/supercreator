"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

export default function SubmissionsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const r = useRouter();
  
  const [course, setCourse] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // pending | marked | all
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradeMarks, setGradeMarks] = useState(0);
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [gradeTotal, setGradeTotal] = useState(100);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Get course
      const { data: courseData } = await supabase
        .from("mp_courses")
        .select("*")
        .eq("id", id)
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!courseData) {
        r.replace("/studio/course");
        return;
      }

      setCourse(courseData);

      // Get submissions
      const { data: submissionsData } = await supabase
        .from("mp_submissions")
        .select("*, student:student_id(display_name, phone_number, avatar_url)")
        .eq("course_id", id)
        .order("submitted_at", { ascending: false });

      setSubmissions(submissionsData || []);
      setLoading(false);
    })();
  }, [user, id, r]);

  const filteredSubmissions = submissions.filter((s) => {
    if (filter === "pending") return !s.marked;
    if (filter === "marked") return s.marked;
    return true;
  });

  async function gradeSubmission() {
    if (!selectedSubmission) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("mp_submissions")
        .update({
          marked: true,
          marks_obtained: gradeMarks,
          marks_total: gradeTotal,
          feedback: gradeFeedback,
          marked_by: user.id,
          marked_at: new Date().toISOString(),
        })
        .eq("id", selectedSubmission.id);

      if (error) throw error;

      // Update local state
      setSubmissions((subs) =>
        subs.map((s) =>
          s.id === selectedSubmission.id
            ? {
                ...s,
                marked: true,
                marks_obtained: gradeMarks,
                marks_total: gradeTotal,
                feedback: gradeFeedback,
                marked_at: new Date().toISOString(),
              }
            : s
        )
      );

      // Reset form
      setSelectedSubmission(null);
      setGradeMarks(0);
      setGradeFeedback("");
      setGradeTotal(100);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-inkmuted">Loading submissions...</div>;
  }

  return (
    <div className="min-h-screen bg-paper p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-ink">📋 Assignment Submissions</h1>
          <p className="text-sm text-inkmuted mt-1">{course?.title}</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {["pending", "marked", "all"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn text-sm capitalize ${
                filter === f
                  ? "btn-brand"
                  : "btn-ghost"
              }`}
            >
              {f === "pending" && "⏳ Pending"}
              {f === "marked" && "✓ Marked"}
              {f === "all" && "📊 All"}
            </button>
          ))}
          <div className="flex-1" />
          <div className="text-sm text-inkmuted">
            {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submissions List */}
          <div className="lg:col-span-2 space-y-3 max-h-[70vh] overflow-y-auto">
            {filteredSubmissions.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-line bg-paper p-8 text-center">
                <p className="text-inkmuted">No submissions yet</p>
              </div>
            ) : (
              filteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubmission(sub);
                    setGradeMarks(sub.marks_obtained || 0);
                    setGradeFeedback(sub.feedback || "");
                    setGradeTotal(sub.marks_total || 100);
                  }}
                  className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    selectedSubmission?.id === sub.id
                      ? "border-brand bg-brand/5 shadow-md"
                      : "border-line hover:border-brand/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink">
                        {sub.student?.display_name || sub.student?.phone_number || "Student"}
                      </div>
                      <div className="text-xs text-inkmuted mt-1">
                        Submitted {new Date(sub.submitted_at).toLocaleDateString()}
                      </div>
                      {sub.submission_text && (
                        <div className="text-sm text-ink mt-2 line-clamp-2">{sub.submission_text}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {sub.marked ? (
                        <div>
                          <div className="text-lg font-bold text-teal">
                            {sub.marks_obtained}/{sub.marks_total}
                          </div>
                          <div className="text-xs text-teal">Marked</div>
                        </div>
                      ) : (
                        <div className="px-2 py-1 rounded-lg bg-yellow-100 text-yellow-700 text-xs font-semibold">
                          Pending
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submission file */}
                  {sub.submission_url && (
                    <a
                      href={sub.submission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-xs text-brand hover:underline"
                    >
                      📎 View submission
                    </a>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Grading Panel */}
          <div className="rounded-xl border-2 border-line bg-white p-4 sticky top-6 h-fit">
            {selectedSubmission ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-ink">Grade Submission</h3>
                  <p className="text-xs text-inkmuted mt-1">
                    {selectedSubmission.student?.display_name || "Student"}
                  </p>
                </div>

                {/* Marks input */}
                <div>
                  <label className="block text-xs font-bold text-inkmuted mb-2">MARKS OBTAINED / TOTAL</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={gradeMarks}
                      onChange={(e) => setGradeMarks(Math.max(0, Number(e.target.value)))}
                      min="0"
                      className="input flex-1"
                      placeholder="Marks"
                    />
                    <span className="flex items-center text-inkmuted">/</span>
                    <input
                      type="number"
                      value={gradeTotal}
                      onChange={(e) => setGradeTotal(Math.max(1, Number(e.target.value)))}
                      min="1"
                      className="input flex-1"
                      placeholder="Total"
                    />
                  </div>
                  <div className="mt-2 text-xs text-inkmuted">
                    Percentage: {gradeTotal > 0 ? Math.round((gradeMarks / gradeTotal) * 100) : 0}%
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <label className="block text-xs font-bold text-inkmuted mb-2">FEEDBACK</label>
                  <textarea
                    value={gradeFeedback}
                    onChange={(e) => setGradeFeedback(e.target.value)}
                    className="input min-h-24 resize-none"
                    placeholder="Add feedback for the student..."
                  />
                </div>

                {/* Submission details */}
                {selectedSubmission.submission_url && (
                  <div className="p-3 bg-paper rounded-lg">
                    <a
                      href={selectedSubmission.submission_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand hover:underline font-semibold flex items-center gap-2"
                    >
                      📎 Open submission file
                    </a>
                  </div>
                )}

                {/* Already marked? */}
                {selectedSubmission.marked && (
                  <div className="p-3 bg-teal/10 rounded-lg">
                    <div className="text-xs font-bold text-teal">✓ Already marked</div>
                    <div className="text-xs text-inkmuted mt-1">
                      {new Date(selectedSubmission.marked_at).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={gradeSubmission}
                  disabled={saving}
                  className="btn btn-brand w-full"
                >
                  {saving ? "Saving..." : selectedSubmission.marked ? "Update Grade" : "Submit Grade"}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">👈</div>
                <p className="text-sm text-inkmuted">Select a submission to grade</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
