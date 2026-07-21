"use client";
import EditorShell from "@/components/studio/EditorShell";
import { PaymentForm } from "@/components/products/Forms";
import { PaymentView } from "@/components/products/Views";
export default function PaymentEditor() {
  return <EditorShell type="payment" backHref="/dashboard/pages" Form={PaymentForm} View={PaymentView} />;
}
