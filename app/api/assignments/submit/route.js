import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";
import { normalizeLink } from "@/lib/driveLink";

export const dynamic = "force-dynamic";

const MAX_FILE = 25 * 1024 * 1024;

/** Learner must own the course (or be its creator) and the lesson must be an assignment. */
async function checkAccess(userId, courseId, lessonId) {
  const { data: course } = await supabaseAdmin.from("mp_courses").select("id, owner_id, modules").eq("id", courseId).maybeSingle();
  if (!course) return { error: "Course not found.", status: 404 };
  if (lessonId) {
    const lesson = (course.modules || []).flatMap((m) => m.lessons || []).find((l) => l.id === lessonId);
    if (!lesson || lesson.type !== "assignment") return { error: "Assignment not found.", status: 404 };
    if (course.owner_id !== userId) {
      const { data: p } = await supabaseAdmin.from("mp_purchases").select("id, expires_at")
        .eq("product_type", "course").eq("product_id", courseId).eq("buyer_id", userId).maybeSingle();
      if (!p) return { error: "You don't have access to this course.", status: 403 };
      if (p.expires_at && new Date(p.expires_at) < new Date()) return { error: "Your access to this course has expired.", status: 403 };
    }
    return { course, lesson };
  }
  return { course };
}

// Submit (or resubmit, until graded) an assignment: file, Drive link and/or text.
export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    const courseId = formData.get("courseId");
    const lessonId = formData.get("lessonId");
    const submissionText = String(formData.get("submissionText") || "").slice(0, 20000);
    const rawLink = String(formData.get("link") || "").trim();

    if (!courseId || !lessonId) return NextResponse.json({ error: "Missing course or lesson." }, { status: 400 });

    const access = await checkAccess(user.id, courseId, lessonId);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { lesson } = access;

    const hasFile = file && typeof file === "object" && file.size > 0;
    if (hasFile && lesson.allowUpload === false) return NextResponse.json({ error: "File uploads are turned off for this assignment." }, { status: 400 });
    if (rawLink && lesson.allowLink === false) return NextResponse.json({ error: "Link submissions are turned off for this assignment." }, { status: 400 });
    if (!hasFile && !rawLink && !submissionText.trim()) return NextResponse.json({ error: "Add a file, a link or a note before submitting." }, { status: 400 });
    if (hasFile && file.size > MAX_FILE) return NextResponse.json({ error: "Files must be under 25 MB — use a Google Drive link for bigger files." }, { status: 400 });

    const { data: existing } = await supabaseAdmin.from("mp_submissions").select("id, marked, submission_url")
      .eq("course_id", courseId).eq("lesson_id", lessonId).eq("student_id", user.id).maybeSingle();
    if (existing?.marked) return NextResponse.json({ error: "This assignment has already been graded." }, { status: 409 });

    let submissionUrl = existing?.submission_url || "";
    if (hasFile) {
      const ext = (file.name.split(".").pop() || "bin").replace(/[^\w]/g, "").slice(0, 8);
      const path = `${courseId}/${lessonId}/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabaseAdmin.storage.from("SuperCreators").upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });
      submissionUrl = supabaseAdmin.storage.from("SuperCreators").getPublicUrl(path).data.publicUrl;
    } else if (rawLink) {
      const r = normalizeLink(rawLink, "file");
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      submissionUrl = r.url;
    }

    const { data: submission, error: dbError } = await supabaseAdmin.from("mp_submissions").upsert({
      course_id: courseId,
      lesson_id: lessonId,
      student_id: user.id,
      submission_url: submissionUrl || "",
      submission_text: submissionText,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: "course_id,lesson_id,student_id" }).select().single();

    if (dbError) return NextResponse.json({ error: `Couldn't save submission: ${dbError.message}` }, { status: 500 });
    return NextResponse.json({ success: true, submission, url: submissionUrl });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// My submission for one assignment, or (?all=1) for every assignment in the course.
export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const lessonId = searchParams.get("lessonId");
    if (!courseId) return NextResponse.json({ error: "Missing courseId." }, { status: 400 });

    if (searchParams.get("all")) {
      const { data } = await supabaseAdmin.from("mp_submissions").select("*")
        .eq("course_id", courseId).eq("student_id", user.id);
      return NextResponse.json({ submissions: data || [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const { data: submission } = await supabaseAdmin.from("mp_submissions").select("*")
      .eq("course_id", courseId).eq("lesson_id", lessonId).eq("student_id", user.id).maybeSingle();
    return NextResponse.json({ submission }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
