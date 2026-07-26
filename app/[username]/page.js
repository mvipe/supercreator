// Root-level store: supercreators.in/username (no /u/ prefix).
// Next matches all the specific routes (/dashboard, /login, /c, /b, …) before
// this catch-all single segment, so only unknown usernames land here.
export { default } from "../u/[username]/page";
