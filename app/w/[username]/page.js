// "Web App" mode: a full marketing-website presentation of a creator's store,
// built entirely from their real profile + published courses/products.
// Server component so the page ships SEO metadata and real HTML.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { productPrice, productMrp } from "@/lib/products";
import CreatorWebsite from "@/components/CreatorWebsite";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://supercreators.in";

export async function generateMetadata({ params }) {
  const username = params.username;
  const { data: p } = await supabaseAdmin.from("mp_profiles")
    .select("display_name, full_name, business_name, bio, avatar_url, meta_title, meta_description, blocked")
    .eq("username", username).maybeSingle();
  if (!p || p.blocked) return { title: `@${username}`, robots: { index: false } };
  const name = p.business_name || p.display_name || p.full_name || `@${username}`;
  const title = p.meta_title || `${name} — Online Courses & Learning`;
  const description = p.meta_description || p.bio || `Learn with ${name}. Expert-led courses, notes, live classes and more.`;
  const images = p.avatar_url ? [{ url: p.avatar_url }] : [];
  return {
    title, description,
    alternates: { canonical: `${BASE}/w/${username}` },
    openGraph: { title, description, url: `${BASE}/w/${username}`, type: "website", images }
  };
}

function courseItem(c) {
  const pr = c.pricing || {};
  const free = pr.mode === "free";
  const hasDisc = pr.discountEnabled && Number(pr.discountPrice) > 0 && Number(pr.discountPrice) < Number(pr.price);
  return {
    kind: "course", type: "course", id: c.id, title: c.title, slug: c.slug,
    img: c.cover_images?.[0] || null, href: `/c/${c.slug}`,
    price: free ? 0 : (hasDisc ? Number(pr.discountPrice) : (Number(pr.price) || 0)),
    mrp: !free && hasDisc ? Number(pr.price) : 0,
    tags: ["Videos", "Notes", "Tests"]
  };
}

export default async function Page({ params }) {
  const username = params.username;
  const { data: profile } = await supabaseAdmin.from("mp_profiles").select("*").eq("username", username).maybeSingle();

  if (!profile || profile.blocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1020] px-4 text-center text-white/70">
        This site isn&rsquo;t available.
      </div>
    );
  }

  const [{ data: courses }, { data: products }, { data: sessions }] = await Promise.all([
    supabaseAdmin.from("mp_courses").select("id,title,slug,cover_images,pricing,sections").eq("owner_id", profile.user_id).eq("status", "published").order("updated_at", { ascending: false }),
    supabaseAdmin.from("mp_products").select("id,type,title,slug,data").eq("owner_id", profile.user_id).eq("status", "published").order("updated_at", { ascending: false }),
    supabaseAdmin.from("mp_sessions").select("id").eq("owner_id", profile.user_id).eq("active", true)
  ]);

  const items = [
    ...(courses || []).map(courseItem),
    ...(products || []).map((x) => {
      const d = x.data || {};
      const path = { book: "/b", event: "/e", locked: "/l", payment: "/p" }[x.type] || "/b";
      return {
        kind: x.type, type: x.type, id: x.id, title: x.title, slug: x.slug,
        img: d.coverImages?.[0] || null, href: `${path}/${x.slug}`,
        price: productPrice(x.type, d), mrp: productMrp(x.type, d),
        tags: x.type === "book" ? ["PDF", "Download"] : ["Access"]
      };
    })
  ];

  // Aggregate a few testimonials from the creator's course pages.
  const testimonials = [];
  for (const c of courses || []) {
    const t = c.sections?.testimonials;
    if (t?.enabled && Array.isArray(t.items)) {
      for (const it of t.items) if (it?.text) testimonials.push({ text: it.text, name: it.name || "Student" });
    }
  }

  const name = profile.business_name || profile.display_name || profile.full_name || `@${username}`;
  const data = {
    username,
    name,
    bio: profile.bio || "",
    avatar: profile.avatar_url || "",
    accent: profile.brand_color || "#6366F1",
    socials: profile.socials || {},
    links: (profile.links || []).filter((l) => l?.url),
    hasSessions: (sessions || []).length > 0
  };

  return <CreatorWebsite data={data} items={items} testimonials={testimonials.slice(0, 9)} />;
}
