// Publish-time validation. Each function returns an array of human-readable
// problems. An empty array means the item is safe to publish.

import { lessonCount } from "@/lib/courseModel";

const isBlank = (s) => !String(s || "").trim();
const DEFAULT_TITLES = ["untitled course", "untitled", "your event title here", "untitled locked content", "untitled payment page"];
const isDefaultTitle = (t) => DEFAULT_TITLES.includes(String(t || "").trim().toLowerCase());

export function validateCourse(course = {}) {
  const issues = [];
  const c = course;

  if (isBlank(c.title) || isDefaultTitle(c.title)) issues.push("Give your course a title");
  if (!c.slug) issues.push("Set a page URL in Settings");
  if (isBlank(c.description)) issues.push("Add a course description");
  if (!(c.coverImages || []).length && isBlank(c.coverVideo)) issues.push("Add a cover image or video");

  const modules = c.modules || [];
  if (modules.length === 0) issues.push("Add at least one module");
  else {
    const emptyModule = modules.find((m) => !(m.lessons || []).length);
    if (emptyModule) issues.push(`Add at least one lesson to "${emptyModule.title || "your module"}"`);
    if (lessonCount(c) > 0) {
      const noPublished = !modules.some((m) => (m.lessons || []).some((l) => l.published));
      if (noPublished) issues.push("Publish at least one lesson");
    }
  }

  const pr = c.pricing || {};
  if (pr.mode === "fixed" && !(Number(pr.price) > 0)) issues.push("Set a price greater than ₹0 (or choose Free)");
  if (pr.mode === "pwyw" && !(Number(pr.minPrice) > 0)) issues.push("Set a minimum price for pay-what-you-want");
  if (pr.mode === "fixed" && pr.discountEnabled && !(Number(pr.discountPrice) > 0)) issues.push("Set a valid discounted price, or turn the discount off");

  return issues;
}

export function validateProduct(type, product = {}) {
  const issues = [];
  const d = product.data || {};

  if (isBlank(product.title) || isDefaultTitle(product.title)) issues.push("Give this a title");
  if (!product.slug) issues.push("Add a page URL");

  if (type === "event") {
    if (isBlank(d.description)) issues.push("Add an event description");
    if (isBlank(d.startsAt)) issues.push("Set a start date & time");
    if (d.mode === "online" && isBlank(d.joinLink)) issues.push("Add the online join link");
    if (d.mode === "offline" && isBlank(d.venue)) issues.push("Add the venue");
    if (d.priceMode === "fixed" && !(Number(d.price) > 0)) issues.push("Set a ticket price (or make it Free)");
  }

  if (type === "locked") {
    const hasContent = !isBlank(d.message) || (d.images || []).length || (d.files || []).length || !isBlank(d.videoUrl);
    if (!hasContent) issues.push("Add the locked content (message, image, video or file)");
    if (!(Number(d.price) > 0)) issues.push("Set an unlock price greater than ₹0");
  }

  if (type === "payment") {
    if (isBlank(d.description)) issues.push("Add a description");
    if (d.priceMode === "fixed" && !(Number(d.price) > 0)) issues.push("Set an amount greater than ₹0");
    if (d.priceMode === "pwyw" && !(Number(d.minPrice) > 0)) issues.push("Set a minimum amount");
  }

  return issues;
}
