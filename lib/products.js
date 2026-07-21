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

export function productPrice(type, data) {
  if (type === "event")  return data.priceMode === "free" ? 0 : Number(data.price) || 0;
  if (type === "locked") return Number(data.price) || 0;
  if (type === "payment") return Number(data.price) || 0;
  if (type === "book") return data.priceMode === "pwyw" ? (Number(data.minPrice) || 0) : (Number(data.price) || 0);
  return 0;
}
