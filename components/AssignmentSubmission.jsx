"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function AssignmentSubmission({ courseId, lessonId, lessonTitle, allowUpload = true }) {
  const { user } = useAuth();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (!user || !courseId || !lessonId) return;
    loadSubmission();
  }, [user, courseId, lessonId]);

  async function loadSubmission() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `/api/assignments/submit?courseId=${courseId}&lessonId=${lessonId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();
      if (result.submission) {
        setSubmission(result.submission);
      }
    } catch (error) {
      console.error("Error loading submission:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!file && !text) {
      alert("Please upload a file or add a note");
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please log in to submit");
        return;
      }

      const formData = new FormData();
      if (file) formData.append("file", file);
      formData.append("courseId", courseId);
      formData.append("lessonId", lessonId);
      formData.append("submissionText", text);

      const response = await fetch("/api/assignments/submit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      setSubmission(result.submission);
      setFile(null);
      setFileName("");
      setText("");
    } catch (error) {
      console.error("Error submitting:", error);
      alert("Failed to submit: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-inkmuted">Loading...</div>;
  }

  // Already submitted and graded
  if (submission?.marked) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-teal bg-teal/5 p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">✓</div>
          <div className="flex-1">
            <div className="font-semibold text-teal">Submitted and Graded</div>
            <div className="text-sm text-inkmuted mt-1">
              Score: <span className="font-bold text-teal">{submission.marks_obtained}/{submission.marks_total}</span>
            </div>
            {submission.feedback && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-teal">
                <div className="text-xs font-bold text-inkmuted mb-1">Feedback:</div>
                <div className="text-sm text-ink whitespace-pre-wrap">{submission.feedback}</div>
              </div>
            )}
            <div className="text-xs text-inkmuted mt-2">
              Graded on {new Date(submission.marked_at).toLocaleDateString()}
            </div>
            {submission.submission_url && (
              <a
                href={submission.submission_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand mt-2 inline-flex items-center gap-1"
              >
                📎 View your submission
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Already submitted, waiting for grading
  if (submission) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-yellow-300 bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⏳</div>
          <div className="flex-1">
            <div className="font-semibold text-yellow-700">Submitted - Awaiting Review</div>
            <div className="text-sm text-yellow-600 mt-1">
              Your instructor will review and grade your submission shortly.
            </div>
            <div className="text-xs text-yellow-600 mt-2">
              Submitted on {new Date(submission.submitted_at).toLocaleDateString()}
            </div>
            {submission.submission_url && (
              <a
                href={submission.submission_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-yellow-700 mt-2 inline-flex items-center gap-1 font-semibold"
              >
                📎 View your submission
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No submission yet
  if (!allowUpload) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-dashed border-line bg-paper p-4 text-center">
        <p className="text-sm text-inkmuted">Upload is not enabled for this assignment</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border-2 border-line bg-white p-4">
      <div className="mb-3">
        <label className="block text-sm font-bold text-ink mb-2">📤 Submit Assignment</label>
        
        {/* Text input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add notes or explanation for your submission..."
          className="input w-full min-h-20 mb-3"
        />

        {/* File upload */}
        <div className="mb-3">
          <label className="block">
            <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line p-4 cursor-pointer hover:border-brand/40 transition-all">
              <span className="text-xl">📎</span>
              <div className="text-left">
                <div className="text-sm font-semibold text-ink">
                  {fileName || "Choose file or drag here"}
                </div>
                <div className="text-xs text-inkmuted">PDF, DOC, images supported</div>
              </div>
            </div>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setFile(e.target.files[0]);
                  setFileName(e.target.files[0].name);
                }
              }}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.zip"
            />
          </label>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={uploading || (!file && !text)}
          className="btn btn-brand w-full disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Submit Assignment"}
        </button>
      </div>
    </div>
  );
}
