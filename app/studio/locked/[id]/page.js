"use client";
import EditorShell from "@/components/studio/EditorShell";
import { LockedForm } from "@/components/products/Forms";
import { LockedView } from "@/components/products/Views";
export default function LockedEditor() {
  return <EditorShell type="locked" backHref="/dashboard/locked" Form={LockedForm} View={LockedView} />;
}
