import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest, getActiveOwnerId } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// =============================================================
// Creator-side assignment review.
// GET  ?courseId=…               -> { assignments[], submissions[] (with student info) }
// POST { id, marks, total, feedback }   grade / re-grade a submission
// POST { id, action: "reopen" }          un-grade so the learner can resubmit
// =============================================================

async function ownCourse(req, courseId) {
  const user = await getUserFromRequest(req);
  if (!user) return { error: "Please sign in first.", status: 401 };
  const ownerId = await getActiveOwnerId(user);
  const { data: course } = await supabaseAdmin.from("mp_courses").select("id, owner_id, title, modules").eq("id", courseId).maybeSingle();
  if (!course) return { error: "Course not found.", status: 404 };
  if (course.owner_id !== ownerId && course.owner_id !== user.id) return { error: "Not your course.", status: 403 };
  return { user, course };
}

export async function GET(req) {
  try {
    const courseId = new URL(req.url).searchParams.get("courseId");
    if (!courseId) return NextResponse.json({ error: "Missing courseId." }, { status: 400 });
    const a = await ownCourse(req, courseId);
    if (a.error) return NextResponse.json({ error: a.error }, { status: a.status });

    const assignments = [];
    for (const m of a.course.modules || []) {
      for (const l of m.lessons || []) {
        if (l.type === "assignment") assignments.push({ id: l.id, title: l.title, module: m.title, maxMarks: l.maxMarks || 100, dueDate: l.dueDate || "", published: l.published !== false });
      }
    }

    const { data: subs, error } = await supabaseAdmin.from("mp_submissions").select("*")
      .eq("course_id", courseId).order("submitted_at", { ascending: false });
    if (error) throw error;

    const ids = [...new Set((subs || []).map((s) => s.student_id))];
    const people = {};
    if (ids.length) {
      const { data: profs } = await supabaseAdmin.from("mp_profiles")
        .select("user_id, display_name, full_name, phone_number, email").in("user_id", ids);
      for (const p of profs || []) people[p.user_id] = p;
      // Buyers often have no profile row — fall back to the checkout details.
      const { data: buys } = await supabaseAdmin.from("mp_purchases").select("*")
        .eq("product_type", "course").eq("product_id", courseId).in("buyer_id", ids);
      for (const b of buys || []) {
        const arr = Array.isArray(b.answers) ? b.answers : [];
        const pick = (re) => { const x = arr.find((a) => re.test(`${a?.id || ""} ${a?.label || ""}`)); return x ? String(x.value ?? x.answer ?? "") : ""; };
        const p = people[b.buyer_id] || (people[b.buyer_id] = {});
        p.full_name = p.full_name || b.buyer_name || pick(/name/i);
        p.phone_number = p.phone_number || b.buyer_phone || pick(/phone/i);
        p.email = p.email || b.buyer_email || pick(/mail/i);
      }
    }

    const titleOf = Object.fromEntries(assignments.map((x) => [x.id, x.title]));
    const submissions = (subs || []).map((s) => {
      const p = people[s.student_id] || {};
      return {
        ...s,
        assignmentTitle: titleOf[s.lesson_id] || "Removed assignment",
        student: { name: p.full_name || p.display_name || (p.phone_number ? `+${String(p.phone_number).replace(/^\+/, "")}` : "") || p.email || "Student", phone: p.phone_number || "", email: p.email || "" }
      };
    });

    return NextResponse.json({ course: { id: a.course.id, title: a.course.title }, assignments, submissions }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: "Missing submission id." }, { status: 400 });
    const { data: sub } = await supabaseAdmin.from("mp_submissions").select("id, course_id").eq("id", b.id).maybeSingle();
    if (!sub) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    const a = await ownCourse(req, sub.course_id);
    if (a.error) return NextResponse.json({ error: a.error }, { status: a.status });

    const now = new Date().toISOString();
    let patch;
    if (b.action === "reopen") {
      patch = { marked: false, marks_obtained: null, marked_at: null, marked_by: null, updated_at: now };
    } else {
      const total = Math.round(Number(b.total));
      const marks = Number(b.marks);
      if (!Number.isFinite(total) || total < 1) return NextResponse.json({ error: "Total marks must be at least 1." }, { status: 400 });
      if (!Number.isFinite(marks) || marks < 0 || marks > total) return NextResponse.json({ error: `Marks must be between 0 and ${total}.` }, { status: 400 });
      patch = { marked: true, marks_obtained: Math.round(marks), marks_total: total, feedback: String(b.feedback || ""), marked_at: now, marked_by: a.user.id, updated_at: now };
    }
    const { data, error } = await supabaseAdmin.from("mp_submissions").update(patch).eq("id", b.id).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, submission: data });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
