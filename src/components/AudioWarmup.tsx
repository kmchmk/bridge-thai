"use client";
import { useEffect } from "react";
import { warmLines, type AudioLine } from "@/lib/tts/speak";

/** Cache visible/next phrases without restarting for unrelated UI state changes. */
export function AudioWarmup({ lines }: { lines: AudioLine[] }) {
  const serialized = JSON.stringify(lines);
  useEffect(() => {
    let cancelled = false;
    void warmLines(JSON.parse(serialized) as AudioLine[], () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [serialized]);
  return null;
}
