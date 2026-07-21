"use client";

export function Switch({ on, onChange }) {
  return (
    <button type="button" className="switch" data-on={!!on} onClick={() => onChange(!on)} aria-pressed={!!on}>
      <span className="knob" />
    </button>
  );
}

export function Field({ label, required, children, hint, counter }) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="req">*</span>}
        {counter && <span className="float-right font-normal text-inkmuted">{counter}</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-inkmuted">{hint}</p>}
    </div>
  );
}

export function SectionCard({ title, on, onToggle, children }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold uppercase tracking-wide">{title}</div>
        {onToggle && <Switch on={on} onChange={onToggle} />}
      </div>
      {children}
    </div>
  );
}

export function RadioCard({ checked, title, desc, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex-1 rounded-card border p-4 text-left transition-colors ${checked ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-inkmuted/40"}`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold">{title}</div>
        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${checked ? "border-brand bg-brand text-white" : "border-line"}`}>
          {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>}
        </span>
      </div>
      {desc && <p className="mt-1 text-xs text-inkmuted">{desc}</p>}
    </button>
  );
}
