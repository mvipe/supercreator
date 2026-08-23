import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifySignature, sendPrivateReply, replyToComment, igAppSecret } from "@/lib/instagram";
import { pickRule, pickCommentReply } from "@/lib/autodm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------
// GET — Meta's subscription handshake. Paste this URL into the app's
// webhook config with the same verify token as META_WEBHOOK_VERIFY_TOKEN.
// ---------------------------------------------------------------
export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const mode = p.get("hub.mode");
  const token = p.get("hub.verify_token");
  const challenge = p.get("hub.challenge");
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.IG_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected) {
    return new Response(challenge || "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

// ---------------------------------------------------------------
// POST — comment events.
// Meta retries anything that isn't a fast 200, so we always answer 200 and
// keep failures in mp_autodm_logs instead of on the wire.
// ---------------------------------------------------------------
export async function POST(req) {
  const raw = await req.text();

  if (igAppSecret()) {
    const { ok } = verifySignature(raw, req.headers.get("x-hub-signature-256"));
    if (!ok) return new Response("Invalid signature", { status: 401 });
  }

  let payload;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  const events = [];
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "comments") continue;
      events.push({ igUserId: String(entry.id), value: change.value || {} });
    }
  }

  // Bounded work per delivery — Meta expects a quick answer.
  for (const ev of events.slice(0, 10)) {
    try { await handleComment(ev); }
    catch (err) { console.error("[autodm] handler error:", err?.message || err); }
  }

  return NextResponse.json({ ok: true });
}

async function handleComment({ igUserId, value }) {
  const commentId = String(value.id || "");
  const commentText = value.text || "";
  const fromId = String(value.from?.id || "");
  const fromUsername = value.from?.username || null;
  const mediaId = String(value.media?.id || "");

  if (!commentId) return;

  // 1. Whose account is this?
  const { data: account } = await supabaseAdmin
    .from("mp_ig_accounts")
    .select("*")
    .eq("ig_user_id", igUserId)
    .eq("active", true)
    .maybeSingle();
  if (!account) return;                       // not a connected creator

  // 2. Never answer ourselves (the creator's own replies come through too).
  if (fromId && fromId === String(account.ig_user_id)) return;

  // 3. Claim the comment. The unique index on comment_id makes duplicate
  //    webhook deliveries a no-op instead of a second DM.
  const { error: claimErr } = await supabaseAdmin.from("mp_autodm_logs").insert({
    user_id: account.user_id,
    ig_account_id: account.id,
    media_id: mediaId || null,
    comment_id: commentId,
    commenter_id: fromId || null,
    commenter_username: fromUsername,
    comment_text: commentText,
    status: "skipped"
  });
  if (claimErr) return;                        // already handled

  const finish = (patch) =>
    supabaseAdmin.from("mp_autodm_logs").update(patch).eq("comment_id", commentId);

  // 4. Which automation answers it?
  const { data: rules } = await supabaseAdmin
    .from("mp_autodm_rules")
    .select("*")
    .eq("ig_account_id", account.id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  const { rule, keyword } = pickRule(rules || [], { mediaId, commentText });
  if (!rule) return;                           // logged as skipped

  // 5. One DM per person, when the creator asked for that.
  if (rule.once_per_user && fromId) {
    const { count } = await supabaseAdmin
      .from("mp_autodm_logs")
      .select("id", { count: "exact", head: true })
      .eq("rule_id", rule.id)
      .eq("commenter_id", fromId)
      .in("status", ["sent", "replied"]);
    if ((count || 0) > 0) {
      await finish({ rule_id: rule.id, matched_keyword: keyword, status: "skipped", error: "Already messaged this person for this automation." });
      return;
    }
  }

  // 6. The DM itself (a private reply — no prior conversation needed).
  try {
    await sendPrivateReply(account, commentId, {
      text: personalize(rule.dm_text, fromUsername),
      buttonLabel: rule.button_label,
      buttonUrl: rule.button_url
    });
  } catch (err) {
    await finish({ rule_id: rule.id, matched_keyword: keyword, status: "failed", error: String(err?.message || err).slice(0, 400) });
    if (isAuthError(err)) {
      await supabaseAdmin.from("mp_ig_accounts")
        .update({ last_error: "Instagram rejected the saved token — reconnect the account.", updated_at: new Date().toISOString() })
        .eq("id", account.id);
    }
    return;
  }

  let status = "sent";

  // 7. Optional public reply under the comment.
  if (rule.reply_to_comment) {
    const reply = pickCommentReply(rule);
    if (reply) {
      try {
        await replyToComment(account, commentId, personalize(reply, fromUsername));
        status = "replied";
      } catch (err) {
        console.error("[autodm] comment reply failed:", err?.message || err);
      }
    }
  }

  await finish({ rule_id: rule.id, matched_keyword: keyword, status, error: null });

  await supabaseAdmin.from("mp_autodm_rules").update({
    sent_count: (rule.sent_count || 0) + 1,
    last_sent_at: new Date().toISOString()
  }).eq("id", rule.id);
}

/** {{name}} / {{username}} in a message body. */
function personalize(text, username) {
  const handle = username ? `@${username}` : "there";
  return String(text || "")
    .replace(/\{\{\s*(username|name|handle)\s*\}\}/gi, handle)
    .trim();
}

const isAuthError = (err) => [190, 102, 10, 200].includes(Number(err?.code));
