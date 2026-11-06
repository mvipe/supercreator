"use client";
// =============================================================
// Lazy-load pdf.js (Mozilla's PDF renderer) from cdnjs, once per page.
// Loaded at runtime like the YouTube IFrame API, so there's nothing to
// npm-install and it only costs bandwidth on pages that actually show or
// import a PDF.
// =============================================================

const VERSION = "3.11.174";
const BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${VERSION}`;
let promise = null;

export function loadPdfJs() {
  if (typeof window === "undefined") return Promise.reject(new Error("pdf.js needs a browser"));
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (promise) return promise;
  promise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `${BASE}/pdf.min.js`;
    s.async = true;
    s.onload = () => {
      const lib = window.pdfjsLib || window["pdfjs-dist/build/pdf"];
      if (!lib) { promise = null; reject(new Error("PDF viewer failed to load.")); return; }
      lib.GlobalWorkerOptions.workerSrc = `${BASE}/pdf.worker.min.js`;
      window.pdfjsLib = lib;
      resolve(lib);
    };
    s.onerror = () => { promise = null; reject(new Error("Couldn't load the PDF viewer — check your connection.")); };
    document.head.appendChild(s);
  });
  return promise;
}
