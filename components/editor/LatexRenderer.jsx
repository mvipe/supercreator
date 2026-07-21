"use client";
import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Renders LaTeX formulas in text
 * Supports inline formulas with $...$ syntax
 */
export function renderLatex(text) {
  if (!text) return [];

  // Split by $ delimiters to find formulas
  const parts = text.split(/(\$[^\$]+\$)/);
  
  return parts.map((part, i) => {
    if (part.startsWith("$") && part.endsWith("$")) {
      return { type: "latex", latex: part.slice(1, -1), key: i };
    }
    return { type: "text", text: part, key: i };
  });
}

export function LatexText({ text }) {
  return (
    <span>
      {renderLatex(text).map((part) =>
        part.type === "latex" ? (
          <LatexFormula key={part.key} latex={part.latex} />
        ) : (
          <span key={part.key}>{part.text}</span>
        )
      )}
    </span>
  );
}

/**
 * Renders a single LaTeX formula using KaTeX
 */
export function LatexFormula({ latex }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !latex) return;
    try {
      katex.render(latex, ref.current, { throwOnError: false });
    } catch (err) {
      console.warn("LaTeX render error:", err, latex);
      ref.current.textContent = `$${latex}$`;
    }
  }, [latex]);

  return (
    <span
      ref={ref}
      className="inline-block"
      title={`Formula: $${latex}$`}
    />
  );
}
