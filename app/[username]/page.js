// Root-level store: supercreators.in/username (no /u/ prefix).
// This is a SERVER component so each creator profile ships real <title>,
// description and Open Graph tags in the initial HTML — what Google needs to
// index the page well. The interactive store itself is the client component.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import StorePublic from "../u/[username]/page";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://supercreators.in";

export async function generateMetadata({ params }) {
  const username = params.username;
  try {
    const { data: p } = await supabaseAdmin.from("mp_profiles")
      .select("username, display_name, full_name, business_name, bio, avatar_url, meta_title, meta_description, blocked")
      .eq("username", username).maybeSingle();

    if (!p || p.blocked) return { title: `@${username} · SuperCreators`, robots: { index: false } };

    const name = p.business_name || p.display_name || p.full_name || `@${username}`;
    const title = p.meta_title || `${name} · SuperCreators`;
    const description = p.meta_description || p.bio ||
      `Explore ${name}'s courses, digital products and sessions on SuperCreators.`;
    const images = p.avatar_url ? [{ url: p.avatar_url }] : [];

    return {
      title,
      description,
      alternates: { canonical: `${BASE}/${username}` },
      openGraph: { title, description, url: `${BASE}/${username}`, type: "profile", images },
      twitter: { card: "summary", title, description, images: p.avatar_url ? [p.avatar_url] : [] }
    };
  } catch {
    return { title: `@${username} · SuperCreators` };
  }
}

export default function Page() {
  return <StorePublic />;
}
