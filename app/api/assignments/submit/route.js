import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const courseId = formData.get("courseId");
    const lessonId = formData.get("lessonId");
    const submissionText = formData.get("submissionText") || "";

    // Get user from auth header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!file || !courseId || !lessonId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Upload file to storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${courseId}/${lessonId}/${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError, data: uploadData } = await supabase.storage
      .from("SuperCreators")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data } = supabase.storage
      .from("SuperCreators")
      .getPublicUrl(fileName);

    const submissionUrl = data.publicUrl;

    // Create or update submission record
    const { data: submission, error: dbError } = await supabase
      .from("mp_submissions")
      .upsert(
        {
          course_id: courseId,
          lesson_id: lessonId,
          student_id: user.id,
          submission_url: submissionUrl,
          submission_text: submissionText,
          submitted_at: new Date().toISOString(),
        },
        {
          onConflict: "course_id,lesson_id,student_id",
        }
      )
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      submission,
      url: submissionUrl,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const lessonId = searchParams.get("lessonId");

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: submission } = await supabase
      .from("mp_submissions")
      .select("*")
      .eq("course_id", courseId)
      .eq("lesson_id", lessonId)
      .eq("student_id", user.id)
      .maybeSingle();

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

