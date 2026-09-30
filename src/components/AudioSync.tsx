"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useT } from "@/components/LangProvider";
import { ctxKey, type AudioCtx } from "@/lib/tts/ctx";
import { getSync, subscribeSync, syncAudio } from "@/lib/tts/offline";
import { lineKey } from "@/lib/tts/speak";

/** Quietly saves the course's audio in this browser (IndexedDB) so taps play instantly. `status` shows progress. */
export function AudioSync({ query, audio, status = false }: { query: string; audio: AudioCtx; status?: boolean }) {
  const t = useT();
  const key = ctxKey(audio);
  useEffect(() => {
    // Wait a moment so the page itself loads first.
    const id = setTimeout(() => void syncAudio(query, (text, gender) => lineKey(text, gender, audio)), 800);
    return () => clearTimeout(id);
    // `audio` is derived from `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, key]);
  const s = useSyncExternalStore(subscribeSync, getSync, () => ({ phase: "idle" as const, done: 0, total: 0 }));
  if (!status) return null;
  const text = s.phase === "now" ? t.audioSaving(s.done, s.total) : s.phase === "rest" ? t.audioSavingMore(s.done, s.total) : s.phase === "done" ? t.audioReady : null;
  return text ? <p role="status" className="text-sm text-slate-500 dark:text-slate-400">{text}</p> : null;
}
