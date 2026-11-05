import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabaseAdmin";
import { driveId, googleDocKind } from "@/lib/driveLink";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;

// =============================================================
// Fetch a PUBLIC document link server-side (browsers can't — CORS) so a
// creator can import a quiz straight from Google Docs / Sheets / Drive /
// Dropbox. Only these hosts are allowed, so this can't be used to probe
// arbitrary URLs.
//
// Returns { name, mime, data (base64) } — the browser turns it into text
// with the same code that handles uploaded files.
// =============================================================

function resolve(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();

  if (host === "docs.google.com") {
    const kind = googleDocKind(url);
    const id = driveId(url);
    if (!id) return null;
    if (kind === "document") return { fetch: `https://docs.google.com/document/d/${id}/export?format=txt`, name: "google-doc.txt" };
    if (kind === "spreadsheets") {
      const gid = u.hash.match(/gid=(\d+)/)?.[1] || u.searchParams.get("gid");
      return { fetch: `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ""}`, name: "google-sheet.csv" };
    }
    if (kind === "presentation") return { fetch: `https://docs.google.com/presentation/d/${id}/export/txt`, name: "google-slides.txt" };
    return null;
  }
  if (host === "drive.google.com") {
    const id = driveId(url);
    return id ? { fetch: `https://drive.google.com/uc?export=download&id=${id}`, name: "" } : null;
  }
  if (host === "www.dropbox.com" || host === "dropbox.com") {
    u.searchParams.set("dl", "1");
    return { fetch: u.toString(), name: decodeURIComponent(u.pathname.split("/").pop() || "") };
  }
  if (host === "dl.dropboxusercontent.com") return { fetch: u.toString(), name: decodeURIComponent(u.pathname.split("/").pop() || "") };
  return null;
}

export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

    const { url } = await req.json();
    const target = resolve(String(url || "").trim());
    if (!target) {
      return NextResponse.json({ error: "Paste a Google Docs, Google Sheets, Google Drive or Dropbox link." }, { status: 400 });
    }

    const res = await fetch(target.fetch, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (SuperCreators importer)" } });
    const mime = (res.headers.get("content-type") || "").toLowerCase();
    if (!res.ok) {
      return NextResponse.json({ error: `Couldn't open that link (HTTP ${res.status}). Set sharing to "Anyone with the link → Viewer" and try again.` }, { status: 400 });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) return NextResponse.json({ error: "That file is larger than 15 MB." }, { status: 400 });

    // Drive answers a private file (or the "can't scan for viruses" page)
    // with an HTML page instead of the file.
    const head = buf.subarray(0, 512).toString("utf8").toLowerCase();
    if (mime.includes("text/html") && (head.includes("<!doctype html") || head.includes("<html")) &&
        (target.fetch.includes("drive.google.com") || target.fetch.includes("docs.google.com"))) {
      return NextResponse.json({ error: "Google returned a sign-in page — the file isn't public. Share it as \"Anyone with the link → Viewer\"." }, { status: 400 });
    }

    const cd = res.headers.get("content-disposition") || "";
    const fromHeader = cd.match(/filename\*=UTF-8''([^;]+)/i)?.[1] || cd.match(/filename="?([^";]+)"?/i)?.[1];
    const name = (fromHeader && decodeURIComponent(fromHeader)) || target.name || "imported";

    return NextResponse.json({ name, mime, data: buf.toString("base64") }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
