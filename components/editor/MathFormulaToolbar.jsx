"use client";
import { useState, useRef } from "react";

/**
 * Math formula toolbar for inserting LaTeX into text fields
 * Inserts LaTeX-formatted formulas into quiz questions/options
 */
export default function MathFormulaToolbar({ onInsert }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const MATH_FORMULAS = [
    // Powers & Roots
    { label: "Square (x²)", latex: "x^2" },
    { label: "Cube (x³)", latex: "x^3" },
    { label: "Power (x^n)", latex: "x^n" },
    { label: "Square Root (√x)", latex: "\\sqrt{x}" },
    { label: "Cube Root (∛x)", latex: "\\sqrt[3]{x}" },

    // Fractions
    { label: "Fraction (a/b)", latex: "\\frac{a}{b}" },
    { label: "Simple Fraction", latex: "\\frac{1}{2}" },

    // Algebraic
    { label: "Polynomial", latex: "ax^2 + bx + c" },
    { label: "Quadratic Formula", latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
    { label: "Linear Equation", latex: "y = mx + b" },

    // Calculus
    { label: "Derivative", latex: "\\frac{d}{dx}f(x)" },
    { label: "Integral", latex: "\\int f(x)\\,dx" },
    { label: "Summation", latex: "\\sum_{i=1}^{n} a_i" },

    // Geometry & Trigonometry
    { label: "Sine (sin)", latex: "\\sin(x)" },
    { label: "Cosine (cos)", latex: "\\cos(x)" },
    { label: "Tangent (tan)", latex: "\\tan(x)" },
    { label: "Pi (π)", latex: "\\pi" },
    { label: "Theta (θ)", latex: "\\theta" },

    // Symbols
    { label: "Plus-Minus (±)", latex: "\\pm" },
    { label: "Infinity (∞)", latex: "\\infty" },
    { label: "Approximately Equal (≈)", latex: "\\approx" },
    { label: "Not Equal (≠)", latex: "\\neq" },
    { label: "Less Than or Equal (≤)", latex: "\\leq" },
    { label: "Greater Than or Equal (≥)", latex: "\\geq" },
    { label: "Multiplication (×)", latex: "\\times" },
    { label: "Division (÷)", latex: "\\div" },

    // Statistics
    { label: "Mean (μ)", latex: "\\mu" },
    { label: "Standard Deviation (σ)", latex: "\\sigma" },
    { label: "Summation (Σ)", latex: "\\Sigma" },
    { label: "Product (Π)", latex: "\\Pi" },

    // Matrices
    { label: "Matrix", latex: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}" },
    { label: "2x2 Matrix", latex: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}" },

    // Logic
    { label: "And (∧)", latex: "\\land" },
    { label: "Or (∨)", latex: "\\lor" },
    { label: "Not (¬)", latex: "\\neg" },
  ];

  const handleInsert = (latex) => {
    onInsert(`$${latex}$`);
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 rounded-lg border border-line bg-paper px-2 py-1 text-xs font-semibold text-brand hover:border-brand hover:bg-brand/5"
        title="Insert math formula"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z" />
          <path d="M8 7h8M8 11h8M8 15h4" />
        </svg>
        ∑ Math
      </button>

      {open && (
        <div
          ref={ref}
          className="absolute right-0 top-full z-50 mt-8 max-h-96 w-72 max-w-[min(18rem,90vw)] overflow-y-auto rounded-lg border border-line bg-white shadow-lg"
        >
          <div className="sticky top-0 bg-paper px-3 py-2 text-xs font-semibold text-inkmuted">
            Insert Math Formula (LaTeX)
          </div>
          <div className="grid grid-cols-2 gap-1 p-2">
            {MATH_FORMULAS.map((formula, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleInsert(formula.latex)}
                className="rounded-lg border border-line px-2 py-1.5 text-left text-xs hover:border-brand hover:bg-brand/5"
                title={`Insert: $${formula.latex}$`}
              >
                <div className="font-semibold text-ink">{formula.label}</div>
                <div className="font-mono text-[10px] text-inkmuted">${formula.latex}$</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}