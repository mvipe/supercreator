"use client";
import { useState } from "react";
import ProductHub from "@/components/dashboard/ProductHub";
import SellDigitalModal from "@/components/SellDigitalModal";

export default function Pages() {
  const [showSell, setShowSell] = useState(false);
  return (
    <>
      <ProductHub
        type="payment"
        title="Payment Pages"
        subtitle="A simple page to collect one-time payments for anything."
        ctaLabel="Create Payment Page"
        onCta={() => setShowSell(true)}
      />
      <SellDigitalModal open={showSell} onClose={() => setShowSell(false)} />
    </>
  );
}
