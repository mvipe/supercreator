#!/usr/bin/env node
/**
 * fix-encoding.js — repairs UTF-8 mojibake + strips UTF-8 BOMs.
 *
 * Cause: files were read as Windows-1252 and re-saved as UTF-8, so the rupee sign
 * (bytes E2 82 B9) got re-encoded into a 3-character garbage run. This reverses
 * that by mapping text back to bytes and re-decoding as UTF-8.
 * Only provably-valid sequences are touched; anything ambiguous is left alone.
 *
 * Usage:  node fix-encoding.js          (dry run — shows what would change)
 *         node fix-encoding.js --write  (apply the fixes)
 */
const fs = require("fs");
const path = require("path");

const WRITE = process.argv.includes("--write");
const EXT = /\.(js|jsx|ts|tsx|mjs|cjs|css|scss|json|sql|md|html|txt)$/i;
const SKIP = new Set(["node_modules", ".git", ".next", "dist", "build", "out", ".vercel"]);

/* Windows-1252 high range: char -> byte. Undefined slots fall back to Latin-1. */
const CP1252 = { "\u20AC":0x80,"\u201A":0x82,"\u0192":0x83,"\u201E":0x84,"\u2026":0x85,
  "\u2020":0x86,"\u2021":0x87,"\u02C6":0x88,"\u2030":0x89,"\u0160":0x8A,"\u2039":0x8B,
  "\u0152":0x8C,"\u017D":0x8E,"\u2018":0x91,"\u2019":0x92,"\u201C":0x93,"\u201D":0x94,
  "\u2022":0x95,"\u2013":0x96,"\u2014":0x97,"\u02DC":0x98,"\u2122":0x99,"\u0161":0x9A,
  "\u203A":0x9B,"\u0153":0x9C,"\u017E":0x9E,"\u0178":0x9F };

const toByte = (ch) => {
  const cp = ch.codePointAt(0);
  if (cp <= 0xFF) return cp;          // Latin-1 range (covers undefined 81/8D/8F/90/9D)
  return CP1252[ch] ?? null;
};
const isLead = (b) => b >= 0xC2 && b <= 0xF4;
const isCont = (b) => b !== null && b >= 0x80 && b <= 0xBF;

function repair(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const lead = toByte(text[i]);
    if (!isLead(lead)) { out += text[i]; continue; }

    const need = lead < 0xE0 ? 1 : lead < 0xF0 ? 2 : 3;
    const bytes = [lead];
    for (let k = 1; k <= need; k++) {
      const b = text[i + k] === undefined ? null : toByte(text[i + k]);
      if (!isCont(b)) break;
      bytes.push(b);
    }
    if (bytes.length !== need + 1) { out += text[i]; continue; }

    // Strict round-trip check: only accept if it decodes to real UTF-8.
    const buf = Buffer.from(bytes);
    const decoded = buf.toString("utf8");
    if (decoded.includes("\uFFFD") || Buffer.compare(Buffer.from(decoded, "utf8"), buf) !== 0) {
      out += text[i]; continue;
    }
    out += decoded;
    i += need;
  }
  return out;
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (EXT.test(entry.name)) acc.push(full);
  }
  return acc;
}

let encCount = 0, bomCount = 0;
for (const file of walk(process.cwd())) {
  const raw = fs.readFileSync(file);
  const hadBom = raw.length >= 3 && raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF;
  const text = (hadBom ? raw.subarray(3) : raw).toString("utf8");

  let fixed = text, pass = 0;
  while (pass++ < 3) { const next = repair(fixed); if (next === fixed) break; fixed = next; }

  const encChanged = fixed !== text;
  if (encChanged) encCount++;
  if (hadBom) bomCount++;
  if (!encChanged && !hadBom) continue;

  const rel = path.relative(process.cwd(), file);
  console.log(`${WRITE ? "fixed" : "would fix"}: ${rel}${encChanged ? " [mojibake]" : ""}${hadBom ? " [BOM]" : ""}`);
  if (WRITE) fs.writeFileSync(file, Buffer.from(fixed, "utf8"));
}

console.log(`\n${WRITE ? "Repaired" : "Found"} ${encCount} mojibake file(s), ${bomCount} BOM(s).`);
if (!WRITE) console.log("Dry run only. Re-run with --write to apply.");