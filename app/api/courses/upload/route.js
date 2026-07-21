import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";
import { uploadVideo } from "@/lib/courseModel";

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("video");

    if (!file || !file.name.match(/\.(mp4|webm|mov|avi|mkv|flv|m3u8|ts|3gp|3g2|mxf|ogv|rm|rmvb|vob|wmv|f4v)$/i)) {
      return NextResponse.json({ error: "Invalid video format" }, { status: 400 });
    }

    const url = await uploadVideo(user.id, file);
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
