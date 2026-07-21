"use client";
import { useState } from "react";
import { Field, RadioCard } from "@/components/ui";
import { slugify, uploadImage } from "@/lib/courseModel";
import { useAuth } from "@/components/AuthProvider";

function SlugField({ product, patch, prefix }) {
  return (
    <Field label="Page URL" required hint="Required before publishing">
      <div className="flex overflow-hidden rounded-[10px] border border-line focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        <span className="flex items-center border-r border-line bg-paper px-3 text-sm text-inkmuted">{prefix}</span>
        <input className="w-full px-3.5 py-2.5 text-sm outline-none" value={product.slug || ""}
          onChange={(e) => patch({ slug: slugify(e.target.value) || null })} />
      </div>
    </Field>
  );
}

function ImagesField({ label, images = [], onChange }) {
  const { user } = useAuth();
  const [up, setUp] = useState(false);
  async function onFiles(files) {
    if (!files?.length) return;
    setUp(true);
    try {
      const urls = [...images];
      for (const f of Array.from(files)) urls.push(await uploadImage(user.id, f));
      onChange(urls);
    } finally { setUp(false); }
  }
  return (
    <Field label={label} hint="1280 × 720 recommended · up to 10 MB each">
      <div className="flex flex-wrap items-center gap-2">
        {images.map((u, i) => (
          <div key={u} className="group relative h-16 w-24 overflow-hidden rounded-lg border border-line">
            <img src={u} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 hidden rounded bg-black/60 px-1.5 text-xs text-white group-hover:block">✕</button>
          </div>
        ))}
        <label className="flex h-16 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line text-xs text-inkmuted hover:border-brand hover:text-brand">
          {up ? "…" : "+ Upload"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        </label>
      </div>
    </Field>
  );
}

/* ---------------- EVENT FORM ---------------- */
export function EventForm({ product, patch, patchData }) {
  const d = product.data;
  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold">Tell us about your event</h2>
      <Field label="Event title" required counter={`${product.title.length}/75`}>
        <input className="input" maxLength={75} value={product.title} onChange={(e) => patch({ title: e.target.value })} />
      </Field>
      <ImagesField label="Cover images" images={d.coverImages} onChange={(coverImages) => patchData({ coverImages })} />
      <Field label="Or a video link"><input className="input" placeholder="https://youtu.be/…" value={d.coverVideo} onChange={(e) => patchData({ coverVideo: e.target.value })} /></Field>
      <Field label="Description" required>
        <textarea className="input min-h-[130px]" value={d.description} onChange={(e) => patchData({ description: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts at" required><input className="input" type="datetime-local" value={d.startsAt} onChange={(e) => patchData({ startsAt: e.target.value })} /></Field>
        <Field label="Ends at"><input className="input" type="datetime-local" value={d.endsAt} onChange={(e) => patchData({ endsAt: e.target.value })} /></Field>
      </div>
      <div className="flex gap-3">
        <RadioCard checked={d.mode === "online"} title="Online" desc="Join link shared after registration" onClick={() => patchData({ mode: "online" })} />
        <RadioCard checked={d.mode === "offline"} title="In person" desc="Venue shown on the page" onClick={() => patchData({ mode: "offline" })} />
      </div>
      {d.mode === "online"
        ? <Field label="Join link (shared with attendees)"><input className="input" placeholder="https://meet.google.com/…" value={d.joinLink} onChange={(e) => patchData({ joinLink: e.target.value })} /></Field>
        : <Field label="Venue"><input className="input" placeholder="Venue address" value={d.venue} onChange={(e) => patchData({ venue: e.target.value })} /></Field>}
      <div className="flex gap-3">
        <RadioCard checked={d.priceMode === "fixed"} title="Paid" onClick={() => patchData({ priceMode: "fixed" })} />
        <RadioCard checked={d.priceMode === "free"} title="Free" onClick={() => patchData({ priceMode: "free" })} />
      </div>
      {d.priceMode === "fixed" && (
        <Field label="Ticket price (₹)" required><input className="input" type="number" min="1" value={d.price} onChange={(e) => patchData({ price: Number(e.target.value) })} /></Field>
      )}
      <Field label="Button text" counter={`${(d.buttonText || "").length}/25`}>
        <input className="input" maxLength={25} value={d.buttonText} onChange={(e) => patchData({ buttonText: e.target.value })} />
      </Field>
      <SlugField product={product} patch={patch} prefix="/e/" />
    </div>
  );
}

/* ---------------- LOCKED FORM ---------------- */
export function LockedForm({ product, patch, patchData }) {
  const d = product.data;
  const { user } = useAuth();
  const [up, setUp] = useState(false);
  async function onFiles(files) {
    if (!files?.length) return;
    setUp(true);
    try {
      const list = [...(d.files || [])];
      for (const f of Array.from(files)) {
        const url = await uploadImage(user.id, f); // storage accepts any file type
        list.push({ name: f.name, url });
      }
      patchData({ files: list });
    } finally { setUp(false); }
  }
  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold">Write or upload content you'd like to sell</h2>
      <Field label="Title" required counter={`${product.title.length}/75`}>
        <input className="input" maxLength={75} value={product.title} onChange={(e) => patch({ title: e.target.value })} />
      </Field>
      <Field label="Category">
        <select className="input" value={d.category} onChange={(e) => patchData({ category: e.target.value })}>
          {["Guide", "Template", "Video", "Notes", "Preset", "E-book", "Other"].map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Public teaser" hint="Shown to everyone before they pay">
        <textarea className="input min-h-[70px]" value={d.teaser} onChange={(e) => patchData({ teaser: e.target.value })} />
      </Field>
      <Field label="Hidden message" hint="Only visible after payment">
        <textarea className="input min-h-[120px]" placeholder="Type your hidden message here…" value={d.message} onChange={(e) => patchData({ message: e.target.value })} />
      </Field>
      <ImagesField label="Hidden images" images={d.images} onChange={(images) => patchData({ images })} />
      <Field label="Hidden video link"><input className="input" placeholder="https://youtu.be/…" value={d.videoUrl} onChange={(e) => patchData({ videoUrl: e.target.value })} /></Field>
      <Field label="Hidden files" hint="PDFs, zips, templates — anything">
        <div className="space-y-2">
          {(d.files || []).map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">📄 {f.name}</span>
              <button type="button" className="text-xs font-semibold text-danger" onClick={() => patchData({ files: d.files.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          <label className="btn-ghost cursor-pointer">{up ? "Uploading…" : "+ Upload file"}<input type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} /></label>
        </div>
      </Field>
      <Field label="Unlock price (₹)" required><input className="input" type="number" min="1" value={d.price} onChange={(e) => patchData({ price: Number(e.target.value) })} /></Field>
      <SlugField product={product} patch={patch} prefix="/l/" />
    </div>
  );
}

/* ---------------- PAYMENT PAGE FORM ---------------- */
export function PaymentForm({ product, patch, patchData }) {
  const d = product.data;
  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold">Set up your payment page</h2>
      <Field label="Title" required counter={`${product.title.length}/75`}>
        <input className="input" maxLength={75} value={product.title} onChange={(e) => patch({ title: e.target.value })} />
      </Field>
      <Field label="Description" required>
        <textarea className="input min-h-[110px]" value={d.description} onChange={(e) => patchData({ description: e.target.value })} />
      </Field>
      <div className="flex gap-3">
        <RadioCard checked={d.priceMode === "fixed"} title="Fixed amount" onClick={() => patchData({ priceMode: "fixed" })} />
        <RadioCard checked={d.priceMode === "pwyw"} title="Customer decides" onClick={() => patchData({ priceMode: "pwyw" })} />
      </div>
      {d.priceMode === "fixed"
        ? <Field label="Amount (₹)" required><input className="input" type="number" min="1" value={d.price} onChange={(e) => patchData({ price: Number(e.target.value) })} /></Field>
        : <Field label="Minimum amount (₹)" required><input className="input" type="number" min="1" value={d.minPrice} onChange={(e) => patchData({ minPrice: Number(e.target.value) })} /></Field>}
      <Field label="Button text" counter={`${(d.buttonText || "").length}/25`}>
        <input className="input" maxLength={25} value={d.buttonText} onChange={(e) => patchData({ buttonText: e.target.value })} />
      </Field>
      <SlugField product={product} patch={patch} prefix="/p/" />
    </div>
  );
}

/* ---------------- BOOK FORM ---------------- */
export function BookForm({ product, patch, patchData }) {
  const d = product.data;
  const { user } = useAuth();
  const [up, setUp] = useState(false);
  async function onFile(files) {
    if (!files?.[0]) return;
    setUp(true);
    try {
      const f = files[0];
      const url = await uploadImage(user.id, f);
      patchData({ fileUrl: url, fileName: f.name });
    } finally { setUp(false); }
  }
  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold">Sell your book / e-book</h2>
      <Field label="Book title" required counter={`${product.title.length}/75`}>
        <input className="input" maxLength={75} value={product.title} onChange={(e) => patch({ title: e.target.value })} />
      </Field>
      <Field label="Author"><input className="input" value={d.author} onChange={(e) => patchData({ author: e.target.value })} placeholder="Your name" /></Field>
      <ImagesField label="Cover image" images={d.coverImages} onChange={(coverImages) => patchData({ coverImages })} />
      <Field label="Description" required>
        <textarea className="input min-h-[110px]" value={d.description} onChange={(e) => patchData({ description: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pages"><input className="input" type="number" min="0" value={d.pages} onChange={(e) => patchData({ pages: Number(e.target.value) })} /></Field>
        <Field label="Format">
          <select className="input" value={d.format} onChange={(e) => patchData({ format: e.target.value })}>
            {["PDF", "EPUB", "MOBI", "ZIP"].map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Book file" required hint="Buyers download this after paying">
        <div className="space-y-2">
          {d.fileUrl && <div className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm"><span className="min-w-0 flex-1 truncate">📄 {d.fileName || "Uploaded file"}</span></div>}
          <label className="btn-ghost cursor-pointer">{up ? "Uploading…" : d.fileUrl ? "Replace file" : "+ Upload file"}<input type="file" className="hidden" onChange={(e) => onFile(e.target.files)} /></label>
        </div>
      </Field>
      <div className="flex gap-3">
        <RadioCard checked={d.priceMode === "fixed"} title="Fixed price" onClick={() => patchData({ priceMode: "fixed" })} />
        <RadioCard checked={d.priceMode === "pwyw"} title="Customer decides" onClick={() => patchData({ priceMode: "pwyw" })} />
      </div>
      {d.priceMode === "fixed"
        ? <Field label="Price (₹)" required><input className="input" type="number" min="1" value={d.price} onChange={(e) => patchData({ price: Number(e.target.value) })} /></Field>
        : <Field label="Minimum price (₹)" required><input className="input" type="number" min="1" value={d.minPrice} onChange={(e) => patchData({ minPrice: Number(e.target.value) })} /></Field>}
      <Field label="Button text" counter={`${(d.buttonText || "").length}/25`}>
        <input className="input" maxLength={25} value={d.buttonText} onChange={(e) => patchData({ buttonText: e.target.value })} />
      </Field>
      <SlugField product={product} patch={patch} prefix="/b/" />
    </div>
  );
}
