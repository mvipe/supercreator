"use client";
import EditorShell from "@/components/studio/EditorShell";
import { BookForm } from "@/components/products/Forms";
import { BookView } from "@/components/products/Views";
export default function BookEditor() {
  return <EditorShell type="book" backHref="/dashboard/books" Form={BookForm} View={BookView} />;
}
