// Defaults + helpers for non-course products (events, locked content, payment pages)
export const PRODUCT_DEFAULTS = {
  event: {
    title: "Your event title here",
    data: {
      coverImages: [], coverVideo: "",
      description: "Describe your event — purpose, key activities, notable speakers. Make it engaging.",
      buttonText: "Register now",
      startsAt: "", endsAt: "",
      mode: "online", venue: "", joinLink: "",
      priceMode: "fixed", price: 199, capacity: 0,
      accent: "#2E6EF7"
    }
  },
  locked: {
    title: "Untitled locked content",
    data: {
      category: "Other",
      teaser: "Unlock this content to view it.",
      message: "", images: [], files: [], videoUrl: "",
      price: 99, accent: "#2E6EF7", buttonText: "Unlock now"
    }
  },
  payment: {
    title: "Untitled payment page",
    data: {
      description: "What is this payment for?",
      priceMode: "fixed", price: 499, minPrice: 99,
      buttonText: "Pay now", accent: "#2E6EF7"
    }
  },
  book: {
    title: "Untitled book",
    data: {
      coverImages: [], author: "",
      description: "What's this book about? Who is it for?",
      pages: 0, format: "PDF",
      fileUrl: "", fileName: "",
      priceMode: "fixed", price: 199, minPrice: 49,
      buttonText: "Buy & download", accent: "#2E6EF7"
    }
  }
};

export const TYPE_META = {
  course:  { label: "Course",        publicPath: "/c" },
  event:   { label: "Event",         publicPath: "/e" },
  locked:  { label: "Locked content", publicPath: "/l" },
  payment: { label: "Payment page",  publicPath: "/p" },
  book:    { label: "Book",          publicPath: "/b" },
  booking: { label: "Booking",       publicPath: "/book" }
};

/** Effective fixed price honouring an "Offer discounted price" toggle, exactly
 *  like a course: `price` is the original, `discountPrice` is what's charged. */
function effectivePrice(d) {
  return d.discountEnabled && Number(d.discountPrice) > 0 ? Number(d.discountPrice) : (Number(d.price) || 0);
}

/** The selling price shown/charged (before pwyw override). */
export function productPrice(type, data) {
  const d = data || {};
  if (type === "event")  return d.priceMode === "free" ? 0 : effectivePrice(d);
  if (type === "locked") return effectivePrice(d);
  if (type === "payment") return d.priceMode === "pwyw" ? (Number(d.minPrice) || 0) : effectivePrice(d);
  if (type === "book") return d.priceMode === "pwyw" ? (Number(d.minPrice) || 0) : effectivePrice(d);
  return 0;
}

/** The struck-through original price when a discount is active, else 0. */
export function productMrp(type, data) {
  const d = data || {};
  if (d.priceMode === "pwyw" || d.priceMode === "free") return 0;
  if (d.discountEnabled && Number(d.discountPrice) > 0 && Number(d.price) > Number(d.discountPrice)) return Number(d.price);
  return 0;
}

/** Find an active coupon on a product by code (case-insensitive). */
export function findProductCoupon(data, code) {
  if (!code) return null;
  return (data?.coupons || []).find((x) => x.code === String(code).toUpperCase() && x.active) || null;
}

/** Rupees to actually charge, honouring free/pwyw/discount. Used by checkout. */
export function productChargeRupees(type, data, { pwywAmount } = {}) {
  const d = data || {};
  if (type === "event") return d.priceMode === "free" ? 0 : effectivePrice(d);
  if (type === "locked") return effectivePrice(d);
  if (type === "book" || type === "payment") {
    if (d.priceMode === "pwyw") return Math.max(Number(d.minPrice) || 1, Number(pwywAmount) || 0);
    return effectivePrice(d);
  }
  return effectivePrice(d);
}
