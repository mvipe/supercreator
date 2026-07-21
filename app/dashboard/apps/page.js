"use client";
import Link from "next/link";

// App-store style list: coloured icon tile + name + description per row,
// matching the mobile tab-bar "Apps" destination.

const APPS = [
  { name: "Courses", desc: "Sell structured learning with modules, lessons and certificates.", href: "/dashboard/courses", emoji: "🎓", tint: "#FFF7DC", live: true },
  { name: "Bookings", desc: "1:1 sessions with availability, slots and payments.", href: "/dashboard/bookings", emoji: "📅", tint: "#FFE9E9", live: true },
  { name: "Events", desc: "Workshops and webinars with registrations.", href: "/dashboard/events", emoji: "🚀", tint: "#F1E9FF", live: true },
  { name: "Books", desc: "Sell e-books, guides and digital downloads.", href: "/dashboard/books", emoji: "📁", tint: "#FFF1E0", live: true },
  { name: "Locked Content", desc: "Pay-to-unlock messages, files and videos.", href: "/dashboard/locked", emoji: "🔒", tint: "#FDE7EC", live: true },
  { name: "Payment Pages", desc: "Collect one-time payments for anything.", href: "/dashboard/pages", emoji: "💳", tint: "#E7F1FF", live: true },
  { name: "AutoDM", desc: "Instagram comment-to-DM automation.", emoji: "💬", tint: "#F3E8FF", live: false },
  { name: "Telegram", desc: "Paid Telegram channel access.", emoji: "✈️", tint: "#E0F2FE", live: false },
  { name: "Discord", desc: "Paid Discord community access.", emoji: "🎮", tint: "#EEF2FF", live: false }
];

export default function Apps() {
  const live = APPS.filter((a) => a.live);
  const soon = APPS.filter((a) => !a.live);

  const Row = ({ a }) => {
    const inner = (
      <>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: a.tint }}>
          {a.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-bold">{a.name}</span>
          <span className="mt-0.5 block truncate text-sm text-inkmuted">{a.desc}</span>
        </span>
        {a.live
          ? <span className="shrink-0 text-inkmuted">›</span>
          : <span className="pill shrink-0 bg-paper text-inkmuted">Soon</span>}
      </>
    );
    const cls = "flex w-full items-center gap-4 rounded-xl border border-line bg-white p-3.5 text-left shadow-sm transition-shadow";
    return a.live
      ? <Link href={a.href} className={`${cls} hover:shadow-md`}>{inner}</Link>
      : <div className={`${cls} opacity-75`}>{inner}</div>;
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">All apps</h1>
      <p className="mt-1 text-sm text-inkmuted">Everything you can plug into your SuperCreators.</p>

      <h2 className="mt-6 text-xs font-bold uppercase tracking-wide text-inkmuted">Live</h2>
      <div className="mt-2 space-y-2.5">{live.map((a) => <Row key={a.name} a={a} />)}</div>

      <h2 className="mt-8 text-xs font-bold uppercase tracking-wide text-inkmuted">Coming soon</h2>
      <div className="mt-2 space-y-2.5">{soon.map((a) => <Row key={a.name} a={a} />)}</div>
    </main>
  );
}
