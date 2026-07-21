// =============================================================
// SuperCreators — AI credit accounting.
//
// 1 credit = 1 generated question. Everyone starts with 50 free; after that
// they buy a pack. Debits go through the mp_spend_ai_credits SQL function so
// two parallel generations can't both pass a read-then-write balance check.
// =============================================================

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const DEFAULT_PACKS = [
  { id: "p100",  credits: 100,  price: 9900 },
  { id: "p500",  credits: 500,  price: 39900 },
  { id: "p2000", credits: 2000, price: 129900 }
];

export const FREE_CREDITS = 50;

/** Packs from platform settings, falling back to the defaults. */
export async function getPacks() {
  const { data } = await supabaseAdmin
    .from("mp_platform_settings").select("ai_credit_packs").maybeSingle();
  const packs = data?.ai_credit_packs;
  if (!Array.isArray(packs) || !packs.length) return DEFAULT_PACKS;
  return packs
    .filter((p) => p && p.id && Number(p.credits) > 0 && Number(p.price) >= 100)
    .map((p) => ({ id: String(p.id), credits: Number(p.credits), price: Number(p.price) }));
}

/** Current balance. Returns 0 if the column/row isn't there yet. */
export async function getBalance(userId) {
  const { data, error } = await supabaseAdmin
    .from("mp_profiles").select("ai_credits").eq("user_id", userId).maybeSingle();
  if (error) return 0;
  return Number(data?.ai_credits ?? 0);
}

/**
 * Atomically spend credits.
 * @returns {Promise<number>} new balance, or -1 if there weren't enough.
 */
export async function spendCredits(userId, credits) {
  const { data, error } = await supabaseAdmin.rpc("mp_spend_ai_credits", {
    p_user: userId,
    p_credits: credits
  });
  if (error) throw new Error(`Credit check failed: ${error.message}. Run supabase/features-pack.sql.`);
  return Number(data);
}

/** Give credits back (a failed generation must not cost anything). */
export async function refundCredits(userId, credits) {
  if (credits <= 0) return;
  try {
    await supabaseAdmin.rpc("mp_add_ai_credits", { p_user: userId, p_credits: credits });
  } catch { /* best effort — never mask the original error */ }
}

/** Append to the usage log. Never throws. */
export async function logUsage(userId, { kind = "quiz", credits, model, meta = {} }) {
  try {
    await supabaseAdmin.from("mp_ai_usage").insert({ user_id: userId, kind, credits, model, meta });
  } catch { /* logging must not break the request */ }
}
