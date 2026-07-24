"use client";
import PreviewFrame from "@/components/studio/PreviewFrame";
import CoursePublicView from "@/components/CoursePublicView";

export default function PreviewPanel({ course }) {
  return (
    <PreviewFrame url={`supercreators.in/c/${course.slug || "your-course"}`}
      childrenMobile={<CoursePublicView course={course} mode="preview" compact />}>
      <CoursePublicView course={course} mode="preview" />
    </PreviewFrame>
  );
}

