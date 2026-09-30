"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/components/LangProvider";
import { DEFAULT_TH, type AudioCtx } from "@/lib/tts/ctx";
import { getSpeaking, lineKey, speakLine, subscribeSpeaking, type SpeakState } from "@/lib/tts/speak";

/**
 * Speaker button. One tap → disabled (no double taps) → spinner while the audio is fetched → "speaking" → back to normal.
 * State is shared per line, so tapping an answer card also animates that answer's speaker button.
 */
export function PlayButton({ text, gender, label, audio = DEFAULT_TH, className = "" }: { text: string; gender: "male" | "female"; label: string; audio?: AudioCtx; className?: string }) {
  const t = useT();
  const key = lineKey(text, gender, audio);
  const snap = useSyncExternalStore(subscribeSpeaking, getSpeaking, () => null);
  const state: SpeakState = snap?.key === key ? snap.state : "idle";
  return (
    <button
      type="button"
      disabled={state !== "idle"}
      onClick={() => speakLine(text, gender, audio)}
      aria-label={t.playAudio(label)}
      aria-busy={state === "loading"}
      className={`flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border bg-white px-3 text-lg transition enabled:hover:bg-brand-100 disabled:cursor-wait dark:border-slate-700 dark:bg-slate-900 dark:enabled:hover:bg-slate-800 ${
        state === "playing" ? "border-brand-500 bg-brand-50 ring-2 ring-brand-300" : ""
      } ${className}`}
    >
      {state === "loading" ? (
        <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      ) : (
        <span aria-hidden className={state === "playing" ? "animate-pulse" : ""}>{state === "playing" ? "🔊" : "🔈"}</span>
      )}
    </button>
  );
}
