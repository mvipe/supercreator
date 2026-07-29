const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://supercreators.in";

// Let search engines crawl public creator pages; keep private areas out.
export default function robots() {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/api", "/studio", "/learn", "/login", "/signup"]
    }],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE
  };
}
