import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "@/components/AuthProvider";

const GA_ID = "G-1NLCLVQK38";
const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://supercreators.in";

// Tells Google the site's real name and its spelling variants
// ("Super Creators", "supercreators.in"), which are what people search for.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE}/#organization`,
      name: "SuperCreators",
      alternateName: ["Super Creators", "SuperCreators.in", "Super Creators App"],
      url: BASE,
      logo: `${BASE}/favicon.png`
    },
    {
      "@type": "WebSite",
      "@id": `${BASE}/#website`,
      name: "SuperCreators",
      alternateName: ["Super Creators", "SuperCreators.in", "Super Creators App"],
      url: BASE,
      inLanguage: "en-IN",
      publisher: { "@id": `${BASE}/#organization` }
    }
  ]
};

export const metadata = {
  metadataBase: new URL(BASE),
  title: "SuperCreators — Sell Online Courses & Digital Products in India",
  description:
    "SuperCreators (Super Creators) is the platform for Indian creators to sell online courses, digital products, ebooks, webinars and 1:1 sessions. Accept UPI & card payments via Razorpay, with coupons, certificates and analytics built in.",
  applicationName: "SuperCreators",
  keywords: [
    "SuperCreators", "Super Creators", "supercreators.in", "supercreators app",
    "sell online courses India", "online course platform", "digital product selling platform",
    "sell digital products", "creator platform India", "creator storefront",
    "sell ebooks online", "sell webinars", "1:1 session booking", "UPI payments Razorpay"
  ],
  openGraph: {
    type: "website",
    siteName: "SuperCreators",
    locale: "en_IN",
    title: "SuperCreators — Sell Online Courses & Digital Products in India",
    description:
      "Build your course page, set your price and start selling in minutes. UPI & cards via Razorpay, coupons, certificates and analytics built in."
  },
  twitter: {
    card: "summary",
    title: "SuperCreators — Sell Online Courses & Digital Products in India",
    description: "Build your course page, set your price and start selling in minutes."
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png"
  }
};

// Without this, phones render the page in a ~980px virtual viewport (the
// "desktop mode" bug). The manual <head> below means we can't rely on Next
// injecting it for us.
export const viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {/* Google tag (gtag.js) */}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="google-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}