"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/supabase";
import { inr } from "@/lib/courseModel";
import { useAuth } from "@/components/AuthProvider";

const fmtDateTime = (value) => value ? new Date(value).toLocaleString("en-IN", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
}) : "—";

export default function CourseStatsPage() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !courseId) return;
    setLoading(true);
    setError("");
    apiFetch(`/api/courses/${courseId}/stats`, undefined, "GET")
      .then((res) => {
        if (res.error) throw new Error(res.error);
        setStats(res);
      })
      .catch((err) => setError(err.message || "Failed to load course stats."))
      .finally(() => setLoading(false));
  }, [user, courseId]);

  const rows = useMemo(() => stats?.sales || [], [stats]);

  return (
    <main className="px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink">Course sales stats</h1>
          <p className="mt-1 text-sm text-inkmuted">Detailed sales and buyer information for this course.</p>
        </div>
        <Link href="/dashboard/courses" className="btn-ghost whitespace-nowrap rounded-lg border border-line px-3 py-2 text-sm font-semibold text-inkmuted hover:text-ink">
          ← Back to courses
        </Link>
      </div>

      {loading && <div className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-inkmuted">Loading course stats…</div>}
      {error && <div className="rounded-2xl border border-danger bg-danger/10 p-6 text-sm text-danger">{error}</div>}

      {!loading && stats && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-line bg-white p-5">
              <div className="text-sm font-semibold text-inkmuted">Course</div>
              <div className="mt-2 text-lg font-bold text-ink">{stats.course.title}</div>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <div className="text-sm font-semibold text-inkmuted">Total sales</div>
              <div className="mt-2 text-3xl font-bold text-ink">{stats.totals.sales}</div>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <div className="text-sm font-semibold text-inkmuted">Unique buyers</div>
              <div className="mt-2 text-3xl font-bold text-ink">{stats.totals.uniqueBuyers}</div>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <div className="text-sm font-semibold text-inkmuted">Revenue</div>
              <div className="mt-2 text-3xl font-bold text-ink">{inr(stats.totals.revenue)}</div>
              <div className="mt-1 text-xs text-inkmuted">Gross: {inr(stats.totals.gross)}</div>
            </div>
          </section>

          <section className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white">
            <div className="grid min-w-[960px] grid-cols-12 gap-4 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-inkmuted">
              <div className="col-span-3">Buyer</div>
              <div className="col-span-2">Contact</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Net to you</div>
              <div className="col-span-2">Purchased</div>
              <div className="col-span-1">Coupon</div>
            </div>
            {rows.length === 0 && (
              <div className="px-5 py-14 text-center text-sm text-inkmuted">No purchases yet for this course.</div>
            )}
            {rows.map((row) => (
              <div key={row.id} className="grid min-w-[960px] grid-cols-12 gap-4 border-b border-line px-5 py-4 last:border-0 text-sm text-ink">
                <div className="col-span-3 min-w-0">
                  <div className="font-semibold truncate">{row.buyerName || "Anonymous"}</div>
                  <div className="mt-1 truncate text-xs text-inkmuted">{row.buyerUsername ? `@${row.buyerUsername}` : ""}</div>
                </div>
                <div className="col-span-2 min-w-0">
                  <div className="truncate text-sm">{row.buyerPhone ? `+${row.buyerPhone}` : "—"}</div>
                  <div className="mt-1 truncate text-xs text-inkmuted">{row.buyerEmail || ""}</div>
                </div>
                <div className="col-span-2 font-semibold">{inr(row.amount)}</div>
                <div className="col-span-2 font-semibold">{inr(row.creatorAmount)}</div>
                <div className="col-span-2 text-sm text-inkmuted">{fmtDateTime(row.purchasedAt)}</div>
                <div className="col-span-1 text-sm text-inkmuted">{row.coupon || "—"}</div>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
