// =============================================================
// SuperCreators — zero-dependency PDF invoice generator.
// Builds a real, spec-compliant PDF (1.4) in pure JS so we don't
// have to pull in jsPDF/pdfkit. Runs in the browser.
//
//   import { downloadInvoice } from "@/lib/invoice";
//   downloadInvoice({ ...payment, seller });
// =============================================================

/* ---------- low-level PDF helpers ---------- */

// Standard-14 fonts use WinAnsi. Map the few chars we care about and
// drop anything else we can't encode (the rupee sign has no WinAnsi
// codepoint, so amounts are printed as "Rs." / "INR").
const WINANSI = {
  "\u20B9": "Rs.", "\u2019": "'", "\u2018": "'", "\u201C": '"', "\u201D": '"',
  "\u2013": "-", "\u2014": "-", "\u2026": "...", "\u00A0": " ", "\u2192": "->",
  "\u2713": "Yes", "\u2717": "No", "\u00D7": "x"
};

function toWinAnsi(str) {
  let out = "";
  for (const ch of String(str ?? "")) {
    if (WINANSI[ch] !== undefined) { out += WINANSI[ch]; continue; }
    const c = ch.codePointAt(0);
    out += c <= 0xff ? ch : "?";
  }
  return out;
}

/** Escape a string for a PDF literal string object. */
function pdfString(str) {
  return toWinAnsi(str).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\r/g, "");
}

/* ---------- Helvetica width metrics (units/1000) ---------- */
// Afm widths for the printable WinAnsi range we use. Anything missing
// falls back to 556, which is close enough for right-alignment.
const HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const HELV_B = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

function charWidth(code, bold) {
  if (code === 32) return bold ? 278 : 278;
  if (code >= 32 && code <= 126) return (bold ? HELV_B : HELV)[code - 32];
  return bold ? 556 : 556;
}

/** Width of `text` at `size` pt, in pt. */
function textWidth(text, size, bold) {
  const s = toWinAnsi(text);
  let w = 0;
  for (let i = 0; i < s.length; i++) w += charWidth(s.charCodeAt(i), bold);
  return (w * size) / 1000;
}

/** Hard-wrap `text` to `maxWidth` pt, returning an array of lines. */
function wrapText(text, size, bold, maxWidth) {
  const words = toWinAnsi(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (textWidth(next, size, bold) > maxWidth && line) { lines.push(line); line = w; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/* ---------- page canvas ---------- */

const PAGE_W = 595.28;  // A4 portrait, pt
const PAGE_H = 841.89;

/** Tiny content-stream builder. y is measured from the top for sanity. */
function Canvas() {
  const ops = [];
  const api = {
    text(str, x, yTop, { size = 10, bold = false, color = [0.07, 0.08, 0.09], align = "left", maxWidth } = {}) {
      let s = toWinAnsi(str);
      if (maxWidth) {
        while (s.length > 1 && textWidth(s, size, bold) > maxWidth) s = s.slice(0, -1);
        if (textWidth(toWinAnsi(str), size, bold) > maxWidth) s = s.slice(0, -1) + "\u2026";
      }
      let x0 = x;
      if (align === "right") x0 = x - textWidth(s, size, bold);
      else if (align === "center") x0 = x - textWidth(s, size, bold) / 2;
      ops.push(
        `BT /${bold ? "F2" : "F1"} ${size} Tf ${color.map(n => n.toFixed(3)).join(" ")} rg ` +
        `1 0 0 1 ${x0.toFixed(2)} ${(PAGE_H - yTop).toFixed(2)} Tm (${pdfString(s)}) Tj ET`
      );
      return api;
    },
    rect(x, yTop, w, h, color = [0.9, 0.92, 0.94]) {
      ops.push(`${color.map(n => n.toFixed(3)).join(" ")} rg ${x.toFixed(2)} ${(PAGE_H - yTop - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
      return api;
    },
    line(x1, yTop, x2, color = [0.898, 0.914, 0.941], width = 0.8) {
      ops.push(
        `${color.map(n => n.toFixed(3)).join(" ")} RG ${width} w ` +
        `${x1.toFixed(2)} ${(PAGE_H - yTop).toFixed(2)} m ${x2.toFixed(2)} ${(PAGE_H - yTop).toFixed(2)} l S`
      );
      return api;
    },
    build: () => ops.join("\n")
  };
  return api;
}

/** Assemble PDF objects into a byte array with a correct xref table. */
function assemblePdf(content) {
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  ];

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [];
  objs.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  // latin1 string -> bytes
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}

/* ---------- money / date ---------- */

/** 149900 (paise) -> "1,49,900.00" (Indian grouping). */
export function formatPaise(paise) {
  const rupees = (Number(paise || 0) / 100).toFixed(2);
  const [whole, dec] = rupees.split(".");
  const neg = whole.startsWith("-");
  const digits = neg ? whole.slice(1) : whole;
  let grouped;
  if (digits.length <= 3) grouped = digits;
  else {
    const last3 = digits.slice(-3);
    const rest = digits.slice(0, -3);
    grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
  }
  return `${neg ? "-" : ""}${grouped}.${dec}`;
}

function fmtDate(d) {
  const dt = d ? new Date(d) : new Date();
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(d) {
  const dt = d ? new Date(d) : new Date();
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Stable, human-readable invoice number from a row id + date. */
export function invoiceNumber(row) {
  const d = new Date(row?.created_at || Date.now());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const tail = String(row?.id || "").replace(/-/g, "").slice(0, 6).toUpperCase() || "000000";
  return `MP-${y}${m}-${tail}`;
}

/* ---------- the invoice ---------- */

const BRAND = [0.180, 0.431, 0.969]; // #2E6EF7
const INK = [0.071, 0.078, 0.090];
const MUTED = [0.42, 0.45, 0.50];
const LINE = [0.898, 0.914, 0.941];

const M = 48;              // page margin
const RIGHT = PAGE_W - M;

/**
 * Build an invoice PDF.
 *
 * @param {object} p
 * @param {object} p.payment  a row from /api/payments (or a sub-order)
 * @param {object} p.seller   { name, business, email, phone, gst, pan }
 * @returns {Uint8Array}
 */
export function buildInvoicePdf({ payment = {}, seller = {} } = {}) {
  const c = Canvas();
  const no = payment.invoice_no || invoiceNumber(payment);

  const gross = Number(payment.gross_amount ?? payment.amount ?? 0);
  const commission = Number(payment.commission_amount ?? 0);
  const net = Number(payment.creator_amount ?? payment.amount ?? 0);
  const hasBreakup = commission > 0 && gross > 0;

  /* header band */
  c.rect(0, 0, PAGE_W, 104, BRAND);
  c.text(seller.business || seller.name || "SuperCreators", M, 44, { size: 20, bold: true, color: [1, 1, 1], maxWidth: 300 });
  c.text("Payment receipt / Tax invoice", M, 64, { size: 9.5, color: [1, 1, 1] });
  c.text("INVOICE", RIGHT, 42, { size: 22, bold: true, color: [1, 1, 1], align: "right" });
  c.text(no, RIGHT, 62, { size: 9.5, color: [1, 1, 1], align: "right" });
  c.text(fmtDate(payment.created_at), RIGHT, 78, { size: 9.5, color: [1, 1, 1], align: "right" });

  /* parties */
  let y = 142;
  const colR = M + 268;

  c.text("BILLED BY", M, y, { size: 8, bold: true, color: MUTED });
  c.text("BILLED TO", colR, y, { size: 8, bold: true, color: MUTED });
  y += 16;

  c.text(seller.business || seller.name || "-", M, y, { size: 11, bold: true, color: INK, maxWidth: 230 });
  c.text(payment.buyer_name || "Customer", colR, y, { size: 11, bold: true, color: INK, maxWidth: 230 });
  y += 14;

  const sellerLines = [
    seller.business && seller.name ? seller.name : null,
    seller.email || null,
    seller.phone ? `+${String(seller.phone).replace(/^\+/, "")}` : null,
    seller.gst ? `GSTIN: ${seller.gst}` : null,
    seller.pan ? `PAN: ${seller.pan}` : null
  ].filter(Boolean);

  const buyerLines = [
    payment.buyer_phone ? `+${String(payment.buyer_phone).replace(/^\+/, "")}` : null,
    payment.buyer_email || null
  ].filter(Boolean);

  const rows = Math.max(sellerLines.length, buyerLines.length);
  for (let i = 0; i < rows; i++) {
    if (sellerLines[i]) c.text(sellerLines[i], M, y, { size: 9.5, color: MUTED, maxWidth: 230 });
    if (buyerLines[i]) c.text(buyerLines[i], colR, y, { size: 9.5, color: MUTED, maxWidth: 230 });
    y += 13;
  }

  /* items table */
  y += 22;
  c.rect(M, y - 12, RIGHT - M, 26, [0.965, 0.976, 0.988]);
  c.text("DESCRIPTION", M + 10, y + 4, { size: 8, bold: true, color: MUTED });
  c.text("QTY", RIGHT - 150, y + 4, { size: 8, bold: true, color: MUTED, align: "right" });
  c.text("AMOUNT (INR)", RIGHT - 10, y + 4, { size: 8, bold: true, color: MUTED, align: "right" });
  y += 26;

  const label = payment.product_name || "Purchase";
  const sub = [payment.product_type_label || payment.product_type, payment.coupon ? `Coupon: ${payment.coupon}` : null]
    .filter(Boolean).join("  ·  ");

  const nameLines = wrapText(label, 10.5, true, RIGHT - M - 180);
  const rowTop = y;
  for (const ln of nameLines) { c.text(ln, M + 10, y + 6, { size: 10.5, bold: true, color: INK }); y += 14; }
  if (sub) { c.text(sub, M + 10, y + 4, { size: 9, color: MUTED, maxWidth: RIGHT - M - 180 }); y += 13; }

  c.text("1", RIGHT - 150, rowTop + 6, { size: 10.5, color: INK, align: "right" });
  c.text(formatPaise(gross || net), RIGHT - 10, rowTop + 6, { size: 10.5, color: INK, align: "right" });

  y += 8;
  c.line(M, y, RIGHT);
  y += 22;

  /* totals */
  const totalRow = (lbl, val, { bold = false, color = INK, size = 10 } = {}) => {
    c.text(lbl, RIGHT - 130, y, { size, bold, color: bold ? color : MUTED, align: "right" });
    c.text(val, RIGHT - 10, y, { size, bold, color, align: "right" });
    y += bold ? 18 : 16;
  };

  if (hasBreakup) {
    totalRow("Subtotal", formatPaise(gross));
    totalRow(`Platform fee${payment.commission_percentage ? ` (${payment.commission_percentage}%)` : ""}`, `- ${formatPaise(commission)}`);
    y += 4;
    c.line(RIGHT - 200, y - 8, RIGHT);
    y += 6;
  }

  c.rect(RIGHT - 210, y - 12, 210, 30, [0.965, 0.976, 0.988]);
  totalRow(hasBreakup ? "Net payable to you" : "Total paid", formatPaise(net || gross), { bold: true, size: 12, color: INK });
  y += 12;

  /* payment meta */
  y += 14;
  c.text("PAYMENT DETAILS", M, y, { size: 8, bold: true, color: MUTED });
  y += 16;

  const meta = [
    ["Status", (payment.status || "paid").toUpperCase()],
    ["Payment date", fmtDateTime(payment.created_at)],
    ["Payment ID", payment.razorpay_payment_id || payment.payment_id],
    ["Order ID", payment.razorpay_order_id || payment.order_id],
    ["Method", payment.method || "Razorpay"]
  ].filter(([, v]) => v);

  for (const [k, v] of meta) {
    c.text(k, M, y, { size: 9.5, color: MUTED });
    c.text(String(v), M + 110, y, { size: 9.5, color: INK, maxWidth: RIGHT - M - 120 });
    y += 14;
  }

  /* footer */
  const footY = PAGE_H - 62;
  c.line(M, footY - 16, RIGHT);
  c.text(
    payment.notes || "This is a computer-generated receipt and does not require a signature.",
    M, footY, { size: 8.5, color: MUTED, maxWidth: RIGHT - M }
  );
  c.text("Powered by SuperCreators", RIGHT, footY, { size: 8.5, color: MUTED, align: "right" });

  return assemblePdf(c.build());
}

/** Build + trigger a browser download. Returns the filename used. */
export function downloadInvoice({ payment = {}, seller = {} } = {}) {
  const bytes = buildInvoicePdf({ payment, seller });
  const name = `invoice-${payment.invoice_no || invoiceNumber(payment)}.pdf`;
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}
