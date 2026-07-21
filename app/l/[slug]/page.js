"use client";
import PublicProductPage from "@/components/products/PublicProductPage";
import { LockedView } from "@/components/products/Views";
export default function LockedPage() { return <PublicProductPage type="locked" View={LockedView} />; }
