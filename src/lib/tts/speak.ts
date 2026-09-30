"use client";

import { ctxBrowserLang, ctxKey, ctxParams, DEFAULT_TH, type AudioCtx } from "./ctx";
import { offlineUrl } from "./offline";

export type SpeakState = "loading" | "playing" | "idle";
type Gender = "male" | "female";

let current: HTMLAudioElement | null = null;

/** Which line is being fetched/spoken right now, shared so every speaker button for that line shows the same state. */
let active: { key: string; state: "loading" | "playing" } | null = null;
const subscribers = new Set<() => void>();
function setActive(next: typeof active) {
  active = next;
  subscribers.forEach((f) => f());
}
export const subscribeSpeaking = (f: () => void) => {
  subscribers.add(f);
  return () => void subscribers.delete(f);
};
export const getSpeaking = () => active;
/** Identity of a line for the speaking state (same text/voice/language = same key). */
export const lineKey = (text: string, gender: Gender, ctx: AudioCtx) => `${ctxKey(ctx)}|${gender}|${text}`;

/** After a cloud failure (e.g. not configured yet), use browser speech for a while instead of retrying every tap. */
let cloudOffUntil = 0;
/** Consecutive load failures; one missing clip must not silence every other line. */
let failStreak = 0;
const prefetched = new Map<string, HTMLAudioElement>();

const audioUrl = (text: string, gender: Gender, ctx: AudioCtx) => `/api/tts?${new URLSearchParams({ text, gender, ...ctxParams(ctx), v: "2" })}`;

export function stopSpeaking() {
  if (current) {
    current.onended = current.onerror = current.onplaying = null;
    current.pause();
    current = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  setActive(null);
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
export function speakLine(text: string, gender: Gender, ctx: AudioCtx = DEFAULT_TH) {
  const key = lineKey(text, gender, ctx);
  stopSpeaking();
  const finish = () => setActive(null);
  const viaBrowser = () => {
    setActive({ key, state: "playing" });
    browserSpeak(text, gender, ctx, finish);
  };
  if (Date.now() < cloudOffUntil) return viaBrowser();

  const audio = new Audio();
  current = audio;
  audio.preload = "auto";
  const fallback = () => {
    if (current !== audio) return;
    current = null;
    if (++failStreak >= 3) cloudOffUntil = Date.now() + 2 * 60_000;
    viaBrowser();
  };
  audio.onplaying = () => {
    if (current !== audio) return;
    failStreak = 0;
    setActive({ key, state: "playing" });
  };
  audio.onended = () => {
    if (current !== audio) return;
    current = null;
    finish();
  };
  audio.onerror = fallback;
  audio.src = offlineUrl(key) ?? prefetched.get(key)?.src ?? audioUrl(text, gender, ctx);
  setActive({ key, state: "loading" });
  audio.play().catch((err: unknown) => {
    if (current !== audio) return; // superseded by another tap
    if ((err as DOMException)?.name === "NotAllowedError") {
      current = null;
      return finish();
    }
    fallback();
  });
}

/** Warm the cache/HTTP cache for a line the learner will probably play next. */
export function prefetchLine(text: string, gender: Gender, ctx: AudioCtx = DEFAULT_TH) {
  if (typeof window === "undefined" || Date.now() < cloudOffUntil) return;
  const key = lineKey(text, gender, ctx);
  if (prefetched.has(key) || offlineUrl(key)) return;
  const a = new Audio();
  a.preload = "auto";
  a.src = audioUrl(text, gender, ctx);
  a.onerror = () => prefetched.delete(key);
  prefetched.set(key, a);
  if (prefetched.size > 40) prefetched.delete(prefetched.keys().next().value!);
}
