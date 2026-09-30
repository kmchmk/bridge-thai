"use client";

import { ctxBrowserLang, ctxKey, ctxParams, DEFAULT_TH, type AudioCtx } from "./ctx";

export type SpeakState = "loading" | "playing" | "idle";
type Gender = "male" | "female";

let current: HTMLAudioElement | null = null;
/** After a cloud failure (e.g. not configured yet), use browser speech for a while instead of retrying every tap. */
let cloudOffUntil = 0;
const prefetched = new Map<string, HTMLAudioElement>();

const audioUrl = (text: string, gender: Gender, ctx: AudioCtx) => `/api/tts?${new URLSearchParams({ text, gender, ...ctxParams(ctx) })}`;

export function stopSpeaking() {
  if (current) {
    current.onended = current.onerror = current.onplaying = null;
    current.pause();
    current = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Fallback voice: the browser's built-in speech synthesis for the line's language. */
function browserSpeak(text: string, gender: Gender, ctx: AudioCtx, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return onEnd?.();
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  const lang = ctxBrowserLang(ctx);
  u.lang = lang;
  u.rate = 0.85;
  u.pitch = gender === "female" ? 1.15 : 0.85; // voices rarely expose gender; nudge pitch as a hint
  const match = synth.getVoices().filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(lang.slice(0, 2).toLowerCase()));
  const exact = match.find((v) => v.lang.replace("_", "-").toLowerCase() === lang.toLowerCase());
  if (exact ?? match[0]) u.voice = (exact ?? match[0])!;
  u.onend = u.onerror = () => onEnd?.();
  synth.speak(u);
}

/**
 * Play a line. The <audio> src is the API URL itself (it 307-redirects to the cached file), so `play()` is
 * called synchronously inside the tap — required by iOS Safari — while generation happens on first use only.
 */
export function speakLine(text: string, gender: Gender, onState?: (s: SpeakState) => void, ctx: AudioCtx = DEFAULT_TH) {
  stopSpeaking();
  if (Date.now() < cloudOffUntil) {
    onState?.("playing");
    return browserSpeak(text, gender, ctx, () => onState?.("idle"));
  }

  const audio = new Audio();
  current = audio;
  audio.preload = "auto";
  const fallback = () => {
    if (current !== audio) return;
    current = null;
    cloudOffUntil = Date.now() + 2 * 60_000;
    onState?.("playing");
    browserSpeak(text, gender, ctx, () => onState?.("idle"));
  };
  audio.onplaying = () => current === audio && onState?.("playing");
  audio.onended = () => current === audio && onState?.("idle");
  audio.onerror = fallback;
  audio.src = prefetched.get(`${ctxKey(ctx)}|${gender}|${text}`)?.src ?? audioUrl(text, gender, ctx);
  onState?.("loading");
  audio.play().catch((err: unknown) => {
    if (current !== audio) return; // superseded by another tap
    if ((err as DOMException)?.name === "NotAllowedError") return onState?.("idle");
    fallback();
  });
}

/** Warm the cache/HTTP cache for a line the learner will probably play next. */
export function prefetchLine(text: string, gender: Gender, ctx: AudioCtx = DEFAULT_TH) {
  if (typeof window === "undefined" || Date.now() < cloudOffUntil) return;
  const key = `${ctxKey(ctx)}|${gender}|${text}`;
  if (prefetched.has(key)) return;
  const a = new Audio();
  a.preload = "auto";
  a.src = audioUrl(text, gender, ctx);
  a.onerror = () => prefetched.delete(key);
  prefetched.set(key, a);
  if (prefetched.size > 40) prefetched.delete(prefetched.keys().next().value!);
}
