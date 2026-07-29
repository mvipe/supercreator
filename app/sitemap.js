import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://supercreators.in";

// Dynamic sitemap so every creator store + published product shows up for
// Google as soon as it's created. Refreshed hourly.
export const revalidate = 3600;

export default async function sitemap() {
  const urls = [{ url: BASE, changeFrequency: "weekly", priority: 1 }];
  try {
    const [{ data: profiles }, { data: courses }, { data: products }] = await Promise.all([
      supabaseAdmin.from("mp_profiles").select("username").not("username", "is", null).eq("blocked", false),
      supabaseAdmin.from("mp_courses").select("slug").eq("status", "published").not("slug", "is", null),
      supabaseAdmin.from("mp_products").select("type, slug").eq("status", "published").not("slug", "is", null)
    ]);

    for (const p of profiles || []) {
      urls.push({ url: `${BASE}/${p.username}`, changeFrequency: "weekly", priority: 0.8 });
    }
    for (const c of courses || []) {
      urls.push({ url: `${BASE}/c/${c.slug}`, changeFrequency: "weekly", priority: 0.7 });
    }
    const path = { book: "b", event: "e", locked: "l", payment: "p" };
    for (const x of products || []) {
      if (path[x.type]) urls.push({ url: `${BASE}/${path[x.type]}/${x.slug}`, changeFrequency: "weekly", priority: 0.6 });
    }
  } catch { /* fall back to just the homepage rather than 500 */ }

  return urls;
}
