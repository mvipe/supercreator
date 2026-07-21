"use client";
import PublicProductPage from "@/components/products/PublicProductPage";
import { PaymentView } from "@/components/products/Views";
export default function PaymentPage() { return <PublicProductPage type="payment" View={PaymentView} />; }
