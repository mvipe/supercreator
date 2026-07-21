"use client";

// Floating WhatsApp support button (bottom-right). Set your number below.
const SUPPORT_PHONE = "919241571892"; // international format, no +
const SUPPORT_MSG = "Hi SuperCreators team, I need help with my account.";

export default function SupportButton() {
  const href = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(SUPPORT_MSG)}`;
  return (
    // Phones: icon only, floated just above the bottom nav (nav is ~60px tall,
    // so bottom-[72px] clears it with a small gap). sm+: icon + "Support" text
    // back at the normal corner.
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat support on WhatsApp"
      className="fixed bottom-[72px] right-4 z-50 flex items-center gap-2 rounded-full bg-[#25D366] p-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 sm:bottom-5 sm:right-5 sm:px-4 sm:py-3">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.11.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.24-8.23a8.2 8.2 0 0 1 5.82 2.42 8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.24 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43-.14-.01-.31-.01-.48-.01a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
      </svg>
      <span className="hidden sm:inline">Support</span>
    </a>
  );
}