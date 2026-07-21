"use client";
import EditorShell from "@/components/studio/EditorShell";
import { EventForm } from "@/components/products/Forms";
import { EventView } from "@/components/products/Views";
export default function EventEditor() {
  return <EditorShell type="event" backHref="/dashboard/events" Form={EventForm} View={EventView} />;
}
