export function I({ d, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}
export const ICONS = {
  home: "M3 10.5L12 4l9 6.5|M5 10v10h14V10",
  store: "M12 21a9 9 0 100-18 9 9 0 000 18z|M3 12h18|M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9z",
  payments: "M3 10h18|M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z",
  learn: "M12 4L2 9l10 5 10-5-10-5z|M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5",
  audience: "M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2|M9 10a4 4 0 100-8 4 4 0 000 8z|M21 20v-2a4 4 0 00-3-3.87|M15 2.13A4 4 0 0118 6",
  refer: "M12 3v12|M8 7l4-4 4 4|M4 13v6h16v-6",
  course: "M12 4L2 9l10 5 10-5-10-5z|M22 9v6",
  booking: "M8 2v4M16 2v4|M3 8h18|M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  event: "M8 2v4M16 2v4|M3 9h18|M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z|M9 14l2 2 4-4",
  locked: "M5 11h14v9H5z|M8 11V7a4 4 0 018 0v4",
  page: "M6 3h9l5 5v13H6z|M14 3v6h6",
  apps: "M4 4h6v6H4z|M14 4h6v6h-6z|M4 14h6v6H4z|M14 14h6v6h-6z",
  bolt: "M13 2L4 14h6l-1 8 9-12h-6l1-8z",
  chat: "M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z"
};
