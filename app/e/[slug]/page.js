"use client";
import PublicProductPage from "@/components/products/PublicProductPage";
import { EventView } from "@/components/products/Views";
export default function EventPage() { return <PublicProductPage type="event" View={EventView} />; }
