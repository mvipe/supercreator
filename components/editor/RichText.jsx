"use client";
import { useEffect, useRef } from "react";

// Lightweight rich text editor (bold / italic / underline / bullets) storing HTML.
export default function RichText({ value, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) ref.current.innerHTML = value || "";
  }, []); // set once; user edits flow outward only

  const cmd = (c) => { document.execCommand(c); ref.current?.focus(); emit(); };
  const emit = () => onChange(ref.current?.innerHTML || "");

  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
      <div className="flex gap-1 border-b border-line bg-paper px-2 py-1.5">
        {[["bold", "B", "font-bold"], ["italic", "I", "italic"], ["underline", "U", "underline"], ["insertUnorderedList", "•≡", ""]].map(([c, t, cls]) => (
          <button key={c} type="button" onMouseDown={(e) => { e.preventDefault(); cmd(c); }}
            className={`rounded px-2.5 py-1 text-sm hover:bg-white ${cls}`}>{t}</button>
        ))}
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning onInput={emit}
        className="prose-sm min-h-[140px] max-w-none px-3.5 py-3 text-sm outline-none [&_ul]:list-disc [&_ul]:pl-5" />
    </div>
  );
}
