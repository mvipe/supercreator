"use client";
import { useId } from "react";

// =============================================================
// Brand social icons.
//
// The store used to render the *letters* "IG", "YT", "X", "W" in coloured
// circles, which looks like a placeholder. These are the real marks, drawn as
// inline SVG so there are no image requests and they stay crisp at any size.
//
// Instagram gets its actual gradient (a flat pink fill is the giveaway that
// it's fake). The gradient id comes from React's useId() so several icons on
// one page can't collide in the SVG defs namespace, and SSR/hydration agree.
// =============================================================

export function InstagramIcon({ size = 18, className = "" }) {
  // useId(), not a module counter: a counter keeps incrementing on the server
  // across requests while the client restarts at 0, so the gradient's id would
  // differ between SSR and hydration and React would throw a mismatch.
  const raw = useId();
  const id = `ig${raw.replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#FDF497" />
          <stop offset="5%" stopColor="#FDF497" />
          <stop offset="45%" stopColor="#FD5949" />
          <stop offset="60%" stopColor="#D6249F" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill={`url(#${id})`} />
      <rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="17" cy="7" r="1.1" fill="#fff" />
    </svg>
  );
}

export function FacebookIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#1877F2" />
      <path fill="#fff" d="M16.3 12.5h-2.4V20h-3.1v-7.5H9.1V9.9h1.7V8.4c0-2.1 1.2-3.3 3.2-3.3.9 0 1.8.1 1.8.1v2h-1c-1 0-1.3.6-1.3 1.2v1.5h2.2l-.4 2.6Z" />
    </svg>
  );
}

export function YouTubeIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#FF0000" />
      <path fill="#fff" d="M10 8.5 16 12l-6 3.5v-7Z" />
    </svg>
  );
}

export function XIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#000" />
      <path fill="#fff" d="M17.2 5.5h2.3l-5 5.8 5.9 7.8h-4.6l-3.6-4.7-4.2 4.7H5.7l5.4-6.2L5.5 5.5h4.8l3.3 4.3 3.6-4.3Zm-.8 12.2h1.3L9.7 6.7H8.3l8.1 11Z" />
    </svg>
  );
}

export function LinkedInIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#0A66C2" />
      <path fill="#fff" d="M8 10H5.6v8H8v-8ZM6.8 8.9a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8ZM18.4 18h-2.3v-4.2c0-1-.4-1.7-1.3-1.7-.7 0-1.1.5-1.3 1a1.7 1.7 0 0 0-.1.7V18H11.1s0-7.1 0-7.9h2.3v1.1c.3-.5.9-1.2 2.1-1.2 1.5 0 2.7 1 2.7 3.2V18Z" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#25D366" />
      <path fill="#fff" d="M12 5.6a6.3 6.3 0 0 0-5.4 9.5l-.8 3 3.1-.8A6.3 6.3 0 1 0 12 5.6Zm3.7 8.9c-.2.4-.9.8-1.2.8-.3 0-.7.2-2.3-.5a8 8 0 0 1-3.3-2.9c-.2-.3-.8-1.1-.8-2s.5-1.4.7-1.6c.2-.2.4-.2.5-.2h.4c.1 0 .3 0 .5.4l.6 1.5c0 .1.1.2 0 .4l-.3.4-.2.2c-.1.1-.2.2 0 .5.2.3.6 1 1.3 1.6.9.8 1.6 1 1.8 1.1.3.1.4.1.6 0l.6-.8c.2-.2.3-.2.5-.1l1.4.7c.2.1.4.2.4.3v.6Z" />
    </svg>
  );
}

export function TelegramIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#229ED9" />
      <path fill="#fff" d="m18.2 7-2.1 9.7c-.1.5-.4.7-.9.4l-2.5-1.8-1.2 1.1c-.1.1-.3.3-.6.3l.2-2.6 4.8-4.3c.2-.2 0-.3-.3-.1L9.7 12.5l-2.5-.8c-.5-.2-.5-.5.1-.8l9.8-3.8c.5-.2.9.1.7.9Z" />
    </svg>
  );
}

export function WebsiteIcon({ size = 18, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#4B5563" />
      <g fill="none" stroke="#fff" strokeWidth="1.5">
        <circle cx="12" cy="12" r="6" />
        <path d="M6 12h12M12 6c2 2.3 2 9.7 0 12M12 6c-2 2.3-2 9.7 0 12" />
      </g>
    </svg>
  );
}

/** key -> { label, Icon }. Keys match profile.socials. */
export const SOCIALS = {
  instagram: { label: "Instagram", Icon: InstagramIcon },
  facebook:  { label: "Facebook",  Icon: FacebookIcon },
  youtube:   { label: "YouTube",   Icon: YouTubeIcon },
  x:         { label: "X",         Icon: XIcon },
  twitter:   { label: "X",         Icon: XIcon },
  linkedin:  { label: "LinkedIn",  Icon: LinkedInIcon },
  whatsapp:  { label: "WhatsApp",  Icon: WhatsAppIcon },
  telegram:  { label: "Telegram",  Icon: TelegramIcon },
  website:   { label: "Website",   Icon: WebsiteIcon }
};

/** Render one social icon by key, falling back to a globe. */
export function SocialIcon({ name, size = 18, className = "" }) {
  const Icon = SOCIALS[name]?.Icon || WebsiteIcon;
  return <Icon size={size} className={className} />;
}

export function socialLabel(name) {
  return SOCIALS[name]?.label || name;
}