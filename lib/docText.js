"use client";
// =============================================================
// SuperCreators — turn an uploaded document into plain text (browser only).
//
//   .docx  -> unzipped with the browser's own DecompressionStream, then
//             word/document.xml is walked paragraph by paragraph. Word's
//             AUTOMATIC numbering ("1." / "a)" that you can't select) is
//             rebuilt from numbering.xml, otherwise every question/option
//             number would vanish.
//   .pdf   -> pdf.js text layer, re-assembled into lines
//   .txt / .csv / .tsv / .json / .md / .gift -> read as-is
//
// No npm packages — zip reading/writing is ~100 lines below.
// =============================================================

import { loadPdfJs } from "@/lib/pdfjs";

/* ---------------- zip (read) ---------------- */

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser can't open .docx files. Use Chrome/Edge/Safari, or save the document as .txt.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Read every entry name -> async getter from a zip ArrayBuffer. */
export function readZip(buf) {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  // End-of-central-directory record: scan back from the end.
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("This file isn't a valid .docx (zip) document.");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const entries = {};
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nameLen));
    entries[name] = async () => {
      const lNameLen = dv.getUint16(local + 26, true);
      const lExtraLen = dv.getUint16(local + 28, true);
      const start = local + 30 + lNameLen + lExtraLen;
      const data = u8.subarray(start, start + csize);
      if (method === 0) return data;
      if (method === 8) return inflateRaw(data);
      throw new Error(`Unsupported zip compression (${method}).`);
    };
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/* ---------------- zip (write, "stored") — used for the .docx template ---------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(u8) {
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Build an uncompressed zip from { name: string } files. */
export function writeZip(files) {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameB = enc.encode(name);
    const data = typeof content === "string" ? enc.encode(content) : content;
    const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(8, 0, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
    lh.setUint16(26, nameB.length, true);
    parts.push(new Uint8Array(lh.buffer), nameB, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
    ch.setUint16(28, nameB.length, true); ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), nameB);
    offset += 30 + nameB.length + data.length;
  }
  const cdSize = central.reduce((n, b) => n + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  const count = Object.keys(files).length;
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, count, true); end.setUint16(10, count, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
}

/* ---------------- .docx -> text ---------------- */

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
function toRoman(n) {
  const map = [[10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
  let s = ""; for (const [v, r] of map) while (n >= v) { s += r; n -= v; }
  return s;
}

function attr(el, name) { return el?.getAttribute(`w:${name}`) ?? el?.getAttribute(name); }
function child(el, tag) { return el ? Array.from(el.childNodes).find((c) => c.nodeName === tag) : null; }

/** numId -> ilvl -> { fmt, start, text } from numbering.xml */
function parseNumbering(xml) {
  if (!xml) return {};
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const abstract = {};
  for (const a of Array.from(doc.getElementsByTagName("w:abstractNum"))) {
    const id = attr(a, "abstractNumId");
    abstract[id] = {};
    for (const lvl of Array.from(a.getElementsByTagName("w:lvl"))) {
      abstract[id][attr(lvl, "ilvl")] = {
        fmt: attr(child(lvl, "w:numFmt"), "val") || "decimal",
        start: Number(attr(child(lvl, "w:start"), "val") || 1),
        text: attr(child(lvl, "w:lvlText"), "val") || ""
      };
    }
  }
  const out = {};
  for (const n of Array.from(doc.getElementsByTagName("w:num"))) {
    out[attr(n, "numId")] = abstract[attr(child(n, "w:abstractNumId"), "val")] || {};
  }
  return out;
}

/** styleId -> { numId, ilvl } for paragraph styles that carry numbering. */
function parseStyleNumbering(xml) {
  if (!xml) return {};
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const out = {};
  for (const st of Array.from(doc.getElementsByTagName("w:style"))) {
    const pPr = child(st, "w:pPr");
    const numPr = pPr && child(pPr, "w:numPr");
    if (!numPr) continue;
    out[attr(st, "styleId")] = {
      numId: attr(child(numPr, "w:numId"), "val"),
      ilvl: Number(attr(child(numPr, "w:ilvl"), "val") || 0)
    };
  }
  return out;
}

function formatNumber(fmt, n) {
  if (fmt === "lowerLetter") return LETTERS[(n - 1) % 26];
  if (fmt === "upperLetter") return LETTERS[(n - 1) % 26].toUpperCase();
  if (fmt === "lowerRoman") return toRoman(n);
  if (fmt === "upperRoman") return toRoman(n).toUpperCase();
  return String(n);
}

export async function docxToText(buf) {
  const zip = readZip(buf);
  if (!zip["word/document.xml"]) throw new Error("No document body found in this .docx.");
  const dec = new TextDecoder();
  const docXml = dec.decode(await zip["word/document.xml"]());
  const numXml = zip["word/numbering.xml"] ? dec.decode(await zip["word/numbering.xml"]()) : "";
  const numbering = parseNumbering(numXml);
  const styleNum = parseStyleNumbering(zip["word/styles.xml"] ? dec.decode(await zip["word/styles.xml"]()) : "");

  const doc = new DOMParser().parseFromString(docXml, "application/xml");
  const counters = {}; // numId -> [count per level]
  const lines = [];

  for (const p of Array.from(doc.getElementsByTagName("w:p"))) {
    let text = "";
    const walk = (node) => {
      for (const c of Array.from(node.childNodes)) {
        if (c.nodeName === "w:t") text += c.textContent;
        else if (c.nodeName === "w:tab") text += "\t";
        else if (c.nodeName === "w:br" || c.nodeName === "w:cr") text += "\n";
        else if (c.nodeName === "w:pPr") continue;
        else if (c.childNodes?.length) walk(c);
      }
    };
    walk(p);

    // Rebuild Word's automatic list numbers.
    const pPr = child(p, "w:pPr");
    const numPr = pPr && child(pPr, "w:numPr");
    // Numbering can sit on the paragraph itself, or come from its style
    // ("List Number", "List Paragraph"…).
    const styleId = pPr ? attr(child(pPr, "w:pStyle"), "val") : null;
    const fromStyle = styleId ? styleNum[styleId] : null;
    if (numPr || fromStyle) {
      const numId = (numPr && attr(child(numPr, "w:numId"), "val")) || fromStyle?.numId;
      const ilvl = Number((numPr && attr(child(numPr, "w:ilvl"), "val")) ?? fromStyle?.ilvl ?? 0) || 0;
      const def = numbering[numId]?.[ilvl];
      if (numId && numId !== "0" && def && def.fmt !== "bullet" && def.fmt !== "none") {
        const c = counters[numId] || (counters[numId] = []);
        c[ilvl] = (c[ilvl] ?? def.start - 1) + 1;
        for (let d = ilvl + 1; d < c.length; d++) c[d] = undefined; // reset deeper levels
        let label = def.text || `%${ilvl + 1}.`;
        label = label.replace(/%(\d)/g, (_, lv) => {
          const L = Number(lv) - 1;
          const ldef = numbering[numId]?.[L] || def;
          return formatNumber(ldef.fmt, c[L] ?? ldef.start);
        });
        if (text.trim()) text = `${label} ${text}`;
      }
    }
    lines.push(text);
  }
  return lines.join("\n").replace(/ /g, " ");
}

/* ---------------- .pdf -> text ---------------- */

export async function pdfToText(buf) {
  const pdfjs = await loadPdfJs();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const out = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const { items } = await page.getTextContent();
    // Group text runs into lines by their baseline (y), then left-to-right.
    const rows = [];
    for (const it of items) {
      if (!it.str) continue;
      const y = it.transform[5], x = it.transform[4];
      let row = rows.find((r) => Math.abs(r.y - y) < 3);
      if (!row) { row = { y, parts: [], h: it.height || 10 }; rows.push(row); }
      row.parts.push({ x, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    let prevY = null;
    for (const r of rows) {
      if (prevY !== null && prevY - r.y > r.h * 1.9) out.push(""); // paragraph gap
      out.push(r.parts.sort((a, b) => a.x - b.x).map((p) => p.s).join(" ").replace(/\s+/g, " ").trim());
      prevY = r.y;
    }
    out.push("");
  }
  return out.join("\n");
}

/* ---------------- dispatcher ---------------- */

function isZip(u8) { return u8[0] === 0x50 && u8[1] === 0x4b; }
function isPdf(u8) { return u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46; }
function isOle(u8) { return u8[0] === 0xd0 && u8[1] === 0xcf && u8[2] === 0x11 && u8[3] === 0xe0; }

/** Strip tags from an HTML document (Word "Web page" .doc, Google Docs HTML). */
function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("br").forEach((b) => b.replaceWith("\n"));
  doc.querySelectorAll("p, div, li, h1, h2, h3, h4, tr").forEach((el) => el.append("\n"));
  return doc.body?.textContent || "";
}

/**
 * Any supported document -> plain text.
 * @param {ArrayBuffer} buf
 * @param {string} [name] file name, used only for hints/errors
 */
export async function bufferToText(buf, name = "") {
  const u8 = new Uint8Array(buf);
  if (isPdf(u8)) return pdfToText(buf);
  if (isZip(u8)) {
    if (/\.(xlsx|pptx)$/i.test(name)) throw new Error("Excel/PowerPoint files aren't supported — export the sheet as CSV, or paste the questions into a Word/Google Doc.");
    return docxToText(buf);
  }
  if (isOle(u8)) throw new Error("Old Word (.doc) files can't be read in the browser. In Word, use File → Save As → .docx (or .txt) and upload that.");
  const text = new TextDecoder("utf-8").decode(u8).replace(/^﻿/, "");
  if (/^\s*<(!doctype html|html)/i.test(text)) return htmlToText(text);
  return text;
}

export async function fileToText(file) {
  return bufferToText(await file.arrayBuffer(), file.name);
}

/* ---------------- downloadable Word template ---------------- */

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A real .docx containing the sample quiz in the "doc" format. */
export function quizTemplateDocx(sampleText) {
  const paras = sampleText.split("\n").map((line) => {
    const bold = /^(Q?\d+[.)]|Answer|Explanation|Marks)/i.test(line.trim());
    const run = line
      ? `<w:r>${bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${esc(line)}</w:t></w:r>`
      : "";
    return `<w:p>${run}</w:p>`;
  }).join("");
  return writeZip({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras}<w:sectPr/></w:body></w:document>`
  });
}
