"use client";

import { useState } from "react";
import { speakThai, type SpeakState } from "@/lib/tts/speak";

export function PlayButton({ text, gender, label, region = "bangkok", className = "" }: { text: string; gender: "male" | "female"; label: string; region?: string; className?: string }) {
  const [state, setState] = useState<SpeakState>("idle");
  return (
    <button
      type="button"
      onClick={() => speakThai(text, gender, setState, region)}
      aria-label={`Play audio: ${label}`}
      aria-busy={state === "loading"}
      className={`flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border bg-white px-3 text-lg transition hover:bg-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 ${
        state === "playing" ? "border-brand-500 ring-2 ring-brand-300" : ""
      } ${className}`}
    >
      <span className={state === "loading" ? "animate-pulse opacity-60" : ""}>{state === "playing" ? "🔊" : "🔈"}</span>
    </button>
  );
}
