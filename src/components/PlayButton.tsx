"use client";

import { useState } from "react";
import { useT } from "@/components/LangProvider";
import { DEFAULT_TH, type AudioCtx } from "@/lib/tts/ctx";
import { speakLine, type SpeakState } from "@/lib/tts/speak";

export function PlayButton({ text, gender, label, audio = DEFAULT_TH, className = "" }: { text: string; gender: "male" | "female"; label: string; audio?: AudioCtx; className?: string }) {
  const t = useT();
  const [state, setState] = useState<SpeakState>("idle");
  return (
    <button
      type="button"
      onClick={() => speakLine(text, gender, setState, audio)}
      aria-label={t.playAudio(label)}
      aria-busy={state === "loading"}
      className={`flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border bg-white px-3 text-lg transition hover:bg-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 ${
        state === "playing" ? "border-brand-500 ring-2 ring-brand-300" : ""
      } ${className}`}
    >
      <span className={state === "loading" ? "animate-pulse opacity-60" : ""}>{state === "playing" ? "🔊" : "🔈"}</span>
    </button>
  );
}
