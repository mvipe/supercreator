// Permissions a creator can grant a sub-admin — mapped to our dashboard
// sections. `path` gates the sidebar link; `key` is stored on the member.
export const TEAM_PERMISSIONS = [
  { key: "store", label: "Store / Profile", path: "/dashboard/store" },
  { key: "courses", label: "Courses", path: "/dashboard/courses" },
  { key: "bookings", label: "Bookings", path: "/dashboard/bookings" },
  { key: "events", label: "Events", path: "/dashboard/events" },
  { key: "books", label: "Books", path: "/dashboard/books" },
  { key: "locked", label: "Locked Content", path: "/dashboard/locked" },
  { key: "pages", label: "Payment Pages", path: "/dashboard/pages" },
  { key: "payments", label: "Payments", path: "/dashboard/payments" },
  { key: "payouts", label: "Payouts", path: "/dashboard/payouts" },
  { key: "audience", label: "Audience / Analytics", path: "/dashboard/audience" },
  { key: "learn", label: "Learn", path: "/dashboard/learn" },
  { key: "refer", label: "Refer & Earn", path: "/dashboard/refer" }
];

export const PERMISSION_KEYS = TEAM_PERMISSIONS.map((p) => p.key);

/** True if `permissions` (null = full owner access) allows a given key. */
export function can(permissions, key) {
  if (permissions == null) return true;      // owner (not a sub-admin)
  return Array.isArray(permissions) && permissions.includes(key);
}
