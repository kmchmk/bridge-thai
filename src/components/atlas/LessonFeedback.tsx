"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Keep the result and its next action in view after answering on a small screen. */
export function LessonFeedback({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, []);
  return (
    <div ref={ref} className="atlas-lesson-feedback">
      {children}
    </div>
  );
}
