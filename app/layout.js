import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata = {
  title: "SuperCreators — sell courses, keep the upside",
  description: "Build, price and sell your online course in minutes."
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}