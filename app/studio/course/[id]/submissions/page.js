"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import AssignmentReview from "@/components/editor/AssignmentReview";

// Stand-alone submissions inbox (same component as the editor's
// Assignments tab). Data comes from /api/assignments/review, which checks
// course ownership server-side and attaches each learner's name/phone.
export default function SubmissionsPage() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const r = useRouter();
  const [title, setTitle] = useState("");

  useEffect(() => { if (!loading && !user) r.replace(`/login?next=/studio/course/${id}/submissions`); }, [loading, user, r, id]);
  if (loading || !user) return <div className="flex min-h-screen items-center justify-center text-inkmuted">Loading…</div>;

  return (
    <div className="min-h-screen bg-paper p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">📋 Assignment submissions</h1>
            <p className="mt-1 text-sm text-inkmuted">{title}</p>
          </div>
          <Link href={`/studio/course/${id}`} className="btn-ghost text-sm">← Back to course editor</Link>
        </div>
        <AssignmentReview courseId={id} onStats={(res) => setTitle(res.course?.title || "")} />
      </div>
    </div>
  );
}
