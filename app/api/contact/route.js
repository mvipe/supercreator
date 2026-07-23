import { NextResponse } from "next/server";

/**
 * POST /api/contact
 *
 * Minimal, dependency-free handler. It validates input and logs the message.
 * Swap the `deliver()` body for your provider of choice — Resend, SendGrid,
 * Nodemailer, or an insert into your MSSQL/Postgres table.
 */

const TOPICS = new Set([
  "support",
  "payouts",
  "refund",
  "creator",
  "legal",
  "other",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Very small in-memory rate limiter (per warm instance).
   For production behind multiple instances, back this with Redis/Upstash. */
const hits = new Map();
function rateLimited(ip, max = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const record = hits.get(ip)?.filter((t) => now - t < windowMs) ?? [];
  record.push(now);
  hits.set(ip, record);
  return record.length > max;
}

async function deliver({ name, email, topic, message }) {
  // ---------------------------------------------------------------
  // Replace this block with real delivery. Example with Resend:
  //
  // await fetch("https://api.resend.com/emails", {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     from: "SuperCreators <noreply@supercreators.in>",
  //     to: ["support@supercreators.in"],
  //     reply_to: email,
  //     subject: `[${topic}] New message from ${name}`,
  //     text: message,
  //   }),
  // });
  // ---------------------------------------------------------------
  console.log("[contact]", { name, email, topic, message });
}

export async function POST(request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many messages. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const topic = String(body.topic ?? "other");
    const message = String(body.message ?? "").trim();

    if (!name || name.length > 120) {
      return NextResponse.json({ error: "Invalid name." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }
    if (!TOPICS.has(topic)) {
      return NextResponse.json({ error: "Invalid topic." }, { status: 400 });
    }
    if (message.length < 20 || message.length > 5000) {
      return NextResponse.json({ error: "Invalid message." }, { status: 400 });
    }

    await deliver({ name, email, topic, message });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}