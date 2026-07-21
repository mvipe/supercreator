"use client";
import PublicProductPage from "@/components/products/PublicProductPage";
import { BookView } from "@/components/products/Views";
export default function BookPage() { return <PublicProductPage type="book" View={BookView} />; }
