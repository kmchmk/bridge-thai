"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** The little traveller reacts: a smile and thumbs up for a good answer, a gentle sad face otherwise. */
function Reaction({ ok }: { ok: boolean }) {
  return (
    <svg
      className={`atlas-reaction ${ok ? "ok" : "bad"}`}
      viewBox="0 0 64 64"
      width="56"
      height="56"
      aria-hidden="true"
    >
      <ellipse cx="30" cy="59" rx="16" ry="3.5" fill="#344b42" opacity="0.14" />
      <rect x="14" y="40" width="32" height="18" rx="9" fill="#d8a85c" />
      <circle cx="30" cy="26" r="17" fill="#f0be93" />
      <ellipse cx="30" cy="14" rx="18" ry="9" fill="#65473a" />
      {ok ? (
        <>
          <path
            d="M22 24 q3 -4 6 0 M34 24 q3 -4 6 0"
            stroke="#4a3328"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M22 31 q8 9 16 0"
            stroke="#8a3b2e"
            strokeWidth="2.6"
            fill="#fff7ee"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="30" r="3" fill="#ee9b86" opacity="0.55" />
          <circle cx="40" cy="30" r="3" fill="#ee9b86" opacity="0.55" />
          <g className="atlas-thumb">
            <rect x="46" y="42" width="12" height="13" rx="4" fill="#f0be93" />
            <rect
              x="49"
              y="31"
              width="5.5"
              height="14"
              rx="2.7"
              fill="#f0be93"
            />
          </g>
        </>
      ) : (
        <>
          <circle cx="23" cy="26" r="2.2" fill="#4a3328" />
          <circle cx="37" cy="26" r="2.2" fill="#4a3328" />
          <path
            d="M19 20 l7 2 M41 20 l-7 2"
            stroke="#4a3328"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M23 36 q7 -7 14 0"
            stroke="#8a3b2e"
            strokeWidth="2.6"
            fill="none"
            strokeLinecap="round"
          />
          <path
            className="atlas-tear"
            d="M40 29 q3 4 0 6.5 q-3 -2.5 0 -6.5z"
            fill="#7fb4dc"
          />
        </>
      )}
    </svg>
  );
}

/** Keep the result and its next action in view after answering on a small screen. */
export function LessonFeedback({
  children,
  correct,
}: {
  children: ReactNode;
  /** When given, the traveller reacts beside the message. */
  correct?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, []);
  return (
    <div
      ref={ref}
      className={`atlas-lesson-feedback${correct === undefined ? "" : " has-reaction"}`}
    >
      {correct !== undefined && <Reaction ok={correct} />}
      {children}
    </div>
  );
}
