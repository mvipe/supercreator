import { supabase } from "@/lib/supabase";

export function slugify(s) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 60);
}
export function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
export function inr(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
export function lessonCount(course) { return (course?.modules || []).reduce((a, m) => a + (m.lessons?.length || 0), 0); }
export function effectivePrice(course) {
  const p = course?.pricing || {};
  if (p.mode === "free") return 0;
  if (p.discountEnabled && Number(p.discountPrice) > 0) return Number(p.discountPrice);
  return Number(p.price) || 0;
}

export const DEFAULTS = {
  title: "Untitled course",
  slug: null,
  status: "draft",
  coverImages: [],
  coverVideo: "",
  description: "Tell learners what they will gain from this course, what they will miss if they don't enroll, and why now is the right time to join.",
  buttonText: "ENROLL NOW",
  sections: {
    gallery: { enabled: false, title: "Our work", images: [] },
    about: { enabled: false, title: "About me", text: "" },
    benefits: { enabled: true, items: ["Lifetime course access"] },
    instructions: { enabled: false, items: [] },
    highlights: { enabled: false, items: [] },
    testimonials: { enabled: false, items: [] },
    faq: { enabled: false, items: [] }
  },
  modules: [
    { id: "m1", title: "Module 1: Introduction", lessons: [{ id: "l1", type: "video", title: "Intro", videoUrl: "", videoFile: null, text: "", published: true, freePreview: false }] }
  ],
  pricing: { mode: "fixed", price: 499, discountEnabled: false, discountPrice: 0, minPrice: 99 },
  validity: { mode: "lifetime", days: 365 },
  settings: {
    theme: "default",
    accent: "#2E6EF7",
    checkoutQuestions: [
      { id: "q_name", label: "What's your name?", type: "text", required: true },
      { id: "q_phone", label: "Add your phone number", type: "phone", required: true }
    ],
    coupons: [],
    terms: "", refundPolicy: "", privacyPolicy: "",
    certificate: false,
    postPurchaseMessage: "You're in! Start learning right away.",
    metaPixelId: "", gaId: ""
  }
};

/** DB row (snake_case) -> app object (camelCase) */
export function fromRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    ownerId: r.owner_id,
    title: r.title,
    slug: r.slug,
    status: r.status,
    coverImages: r.cover_images || [],
    coverVideo: r.cover_video || "",
    description: r.description || "",
    buttonText: r.button_text || "ENROLL NOW",
    sections: { ...DEFAULTS.sections, ...(r.sections || {}) },
    modules: r.modules || [],
    pricing: { ...DEFAULTS.pricing, ...(r.pricing || {}) },
    validity: { ...DEFAULTS.validity, ...(r.validity || {}) },
    settings: { ...DEFAULTS.settings, ...(r.settings || {}) },
    views: r.views || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

/** app object -> DB row */
export function toRow(c) {
  return {
    title: c.title,
    slug: c.slug || null,
    status: c.status,
    cover_images: c.coverImages,
    cover_video: c.coverVideo,
    description: c.description,
    button_text: c.buttonText,
    sections: c.sections,
    modules: c.modules,
    pricing: c.pricing,
    validity: c.validity,
    settings: c.settings,
    updated_at: new Date().toISOString()
  };
}

export function ytEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  const v = url.match(/vimeo\.com\/(\d+)/);
  if (v) return `https://player.vimeo.com/video/${v[1]}`;
  return null;
}

/** Upload an image to Supabase Storage, return public URL. */
export async function uploadImage(userId, file) {
  const path = `${userId}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`;
  const { error } = await supabase.storage.from("megaprofile").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("megaprofile").getPublicUrl(path);
  return data.publicUrl;
}

/** Upload a video to Supabase Storage, return public URL. */
export async function uploadVideo(userId, file) {
  const maxSize = 500 * 1024 * 1024; // 500 MB
  if (file.size > maxSize) throw new Error("Video must be under 500 MB");
  
  const path = `${userId}/videos/${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`;
  const { error } = await supabase.storage.from("megaprofile").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("megaprofile").getPublicUrl(path);
  return data.publicUrl;
}

/* ---------------- protected course media ---------------- */

export const SECURE_BUCKET = "megaprofile-secure";

export const MEDIA_LIMITS = {
  video: 500 * 1024 * 1024,
  audio: 100 * 1024 * 1024,
  notes: 50 * 1024 * 1024
};

/**
 * Upload course media to the PRIVATE bucket and return its storage path.
 *
 * The old uploadVideo() puts files in the public 'megaprofile' bucket, which
 * means the raw URL is in the page source and anyone can download it without
 * even logging in. Protected lesson media goes here instead, and is only ever
 * served through /api/learn/media as a short-lived signed URL.
 *
 * Returns a PATH (not a URL) — there is no public URL for these by design.
 */
export async function uploadSecureMedia(userId, file, kind = "video", onProgress) {
  const limit = MEDIA_LIMITS[kind] || MEDIA_LIMITS.video;
  if (file.size > limit) {
    throw new Error(`${file.name}: must be under ${Math.round(limit / 1024 / 1024)} MB`);
  }
  const safe = file.name.replace(/[^\w.\-]/g, "_");
  const path = `${userId}/${kind}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safe}`;

  const { error } = await supabase.storage.from(SECURE_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined
  });
  if (error) {
    if (/bucket not found/i.test(error.message)) {
      throw new Error("Secure storage bucket is missing — run supabase/features-pack.sql.");
    }
    throw error;
  }
  onProgress?.(1);
  return path;
}

/** Best-effort delete of a secure file (e.g. when a lesson is removed). */
export async function deleteSecureMedia(path) {
  if (!path) return;
  try { await supabase.storage.from(SECURE_BUCKET).remove([path]); } catch { /* non-fatal */ }
}

/** Math functions available for quiz questions */
export const MATH_FUNCTIONS = [
  { name: "square", label: "Square (x²)", formula: "x² = x * x" },
  { name: "cube", label: "Cube (x³)", formula: "x³ = x * x * x" },
  { name: "sqrt", label: "Square Root (√x)", formula: "√x" },
  { name: "cbrt", label: "Cube Root (∛x)", formula: "∛x" },
  { name: "pow", label: "Power (x^n)", formula: "x^n" },
  { name: "abs", label: "Absolute Value (|x|)", formula: "|x|" },
  { name: "sin", label: "Sine (sin)", formula: "sin(x)" },
  { name: "cos", label: "Cosine (cos)", formula: "cos(x)" },
  { name: "tan", label: "Tangent (tan)", formula: "tan(x)" },
  { name: "log", label: "Logarithm (log)", formula: "log(x)" },
  { name: "ln", label: "Natural Log (ln)", formula: "ln(x)" },
  { name: "exp", label: "Exponential (e^x)", formula: "e^x" },
  { name: "factorial", label: "Factorial (n!)", formula: "n!" },
  { name: "gcd", label: "GCD", formula: "gcd(a,b)" },
  { name: "lcm", label: "LCM", formula: "lcm(a,b)" }
];

/** Evaluate mathematical expression */
export function evaluateMath(expression, variables = {}) {
  try {
    // Basic security check - only allow math operations
    const allowedPattern = /^[0-9+\-*/().\s√π]*$/;
    if (!allowedPattern.test(expression)) return null;
    
    // Safe evaluation using Function constructor with math operations
    const mathFn = new Function(...Object.keys(variables), `return ${expression}`);
    return mathFn(...Object.values(variables));
  } catch {
    return null;
  }
}