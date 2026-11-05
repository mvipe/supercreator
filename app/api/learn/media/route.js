import { NextResponse } from "next/server";
import { supabaseAdmin, getUserFromRequest } from "@/lib/supabaseAdmin";
import { signMediaToken } from "@/lib/mediaToken";
import { toPreviewUrl } from "@/lib/driveLink";

export const dynamic = "force-dynamic";

const BUCKET = "megaprofile-secure";
const TTL = 60 * 60 * 2;         // 2h for buyers
const PREVIEW_TTL = 60 * 30;     // 30 min for free previews — shorter, it's public

/**
 * Mint a short-lived signed URL for one lesson's media.
 *
 * Access rules, in order:
 *   1. lesson.freePreview  -> open to everyone, even logged out (the sales
 *      page is public, so requiring a login here would kill the preview)
 *   2. course owner        -> always (studio preview)
 *   3. anyone else         -> must have an unexpired purchase
 *
 * freePreview is read from the DB, never from the request, so a client asking
 * for a preview of a locked lesson gets nothing.
 *
 * This exists because course media used to sit in the public bucket: the URL
 * was in the page source and anyone could download it, logged in or not.
 */
export async function POST(req) {
  try {
    const { courseId, lessonId } = await req.json();
    if (!courseId || !lessonId) return NextResponse.json({ error: "Missing courseId or lessonId." }, { status: 400 });

    const { data: course, error: cErr } = await supabaseAdmin
      .from("mp_courses").select("id, owner_id, status, modules").eq("id", courseId).maybeSingle();
    if (cErr) throw cErr;
    if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });

    const lesson = (course.modules || []).flatMap((m) => m.lessons || []).find((l) => l.id === lessonId);
    if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });

    const isFreePreview = lesson.freePreview === true && lesson.published !== false;

    // Only look up the user when we actually need to — free previews stay
    // available to logged-out visitors.
    let isOwner = false;
    let uid = "";
    if (!isFreePreview) {
      const user = await getUserFromRequest(req);
      if (!user) return NextResponse.json({ error: "Please sign in to watch this lesson." }, { status: 401 });

      isOwner = course.owner_id === user.id;
      uid = user.id;
      if (!isOwner) {
        const { data: p } = await supabaseAdmin.from("mp_purchases").select("id, expires_at")
          .eq("product_type", "course").eq("product_id", courseId).eq("buyer_id", user.id).maybeSingle();
        if (!p) return NextResponse.json({ error: "You don't have access to this course." }, { status: 403 });
        if (p.expires_at && new Date(p.expires_at) < new Date()) {
          return NextResponse.json({ error: "Your access to this course has expired." }, { status: 403 });
        }
      }
      if (!isOwner && lesson.published === false) {
        return NextResponse.json({ error: "This lesson isn't published yet." }, { status: 403 });
      }
    }

    const ttl = isFreePreview && !isOwner ? PREVIEW_TTL : TTL;
    const allowDownload = lesson.type === "notes" && lesson.allowDownload === true;

    // Notes can carry MANY files (uploads and/or Drive links).
    //   download ON  -> real signed URLs (the Download button needs the file)
    //   download OFF -> /api/learn/stream tokens: the file can be shown by our
    //                   viewer but not opened/saved as a link (see that route)
    if (lesson.type === "notes" && Array.isArray(lesson.files) && lesson.files.length) {
      const files = [];
      for (const f of lesson.files) {
        if (f?.driveUrl) {
          files.push({ drive: true, url: f.driveUrl, preview: toPreviewUrl(f.driveUrl), fileName: f.fileName || "Google Drive file", fileType: "link" });
          continue;
        }
        if (!f?.mediaPath) continue;
        const isPdf = f.fileType === "application/pdf" || /\.pdf$/i.test(f.fileName || f.mediaPath);
        if (allowDownload) {
          const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(f.mediaPath, ttl);
          if (!error && data?.signedUrl) files.push({ url: data.signedUrl, fileName: f.fileName || "", fileType: f.fileType || "" });
        } else {
          const t = signMediaToken({ path: f.mediaPath, kind: isPdf ? "pdf" : "file", mime: f.fileType || (isPdf ? "application/pdf" : ""), uid, ttl });
          files.push({ stream: `/api/learn/stream?t=${t}`, url: "", fileName: f.fileName || "", fileType: f.fileType || (isPdf ? "application/pdf" : "") });
        }
      }
      return NextResponse.json({
        files,
        url: files[0]?.url || "",
        allowDownload,
        expiresIn: ttl
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const path = lesson.mediaPath || lesson.videoPath || lesson.filePath || lesson.audioPath;

    // Legacy lessons still point at a public URL. Hand it back unchanged so
    // existing courses keep working; new uploads go to the private bucket.
    if (!path) {
      const legacy = lesson.videoUrl || lesson.audioUrl || lesson.fileUrl || "";
      return NextResponse.json({
        url: legacy,
        legacy: true,
        allowDownload: lesson.type === "notes" && lesson.allowDownload === true,
        expiresIn: null
      });
    }

    // Notes with download ON get the real file; everything else (video,
    // audio, view-only notes) is served through the stream proxy so no
    // reusable file URL ever reaches the page.
    if (allowDownload) {
      const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, ttl);
      if (error) throw new Error(`Could not sign media URL: ${error.message}`);
      return NextResponse.json({ url: data.signedUrl, legacy: false, allowDownload: true, expiresIn: ttl }, { headers: { "Cache-Control": "no-store" } });
    }

    const kind = lesson.type === "audio" ? "audio"
      : lesson.type === "notes" ? (/\.pdf$/i.test(lesson.fileName || path) || lesson.fileType === "application/pdf" ? "pdf" : "file")
      : "video";
    const mime = lesson.fileType || lesson.mime || (kind === "pdf" ? "application/pdf" : "");
    const t = signMediaToken({ path, kind, mime, uid, ttl });
    const stream = `/api/learn/stream?t=${t}`;

    return NextResponse.json({
      url: stream,
      stream,
      legacy: false,
      allowDownload: false,
      expiresIn: ttl
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}