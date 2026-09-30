"use client";

export type SpeakState = "loading" | "playing" | "idle";
type Gender = "male" | "female";
type Region = string;

let current: HTMLAudioElement | null = null;
/** After a cloud failure (e.g. not configured yet), use browser speech for a while instead of retrying every tap. */
let cloudOffUntil = 0;
const prefetched = new Map<string, HTMLAudioElement>();

const audioUrl = (text: string, gender: Gender, region: Region) => `/api/tts?${new URLSearchParams({ text, gender, region })}`;

export function stopSpeaking() {
  if (current) {
    current.onended = current.onerror = current.onplaying = null;
    current.pause();
    current = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Fallback voice: the browser's built-in Thai speech synthesis. */
function browserSpeak(text: string, gender: Gender, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return onEnd?.();
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "th-TH";
  u.rate = 0.85;
  u.pitch = gender === "female" ? 1.15 : 0.85; // voices rarely expose gender; nudge pitch as a hint
  const thai = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("th"));
  if (thai[0]) u.voice = thai[0];
  u.onend = u.onerror = () => onEnd?.();
  synth.speak(u);
}

/**
 * Play a line. The <audio> src is the API URL itself (it 307-redirects to the cached file), so `play()` is
 * called synchronously inside the tap — required by iOS Safari — while generation happens on first use only.
 */
export function speakThai(text: string, gender: Gender, onState?: (s: SpeakState) => void, region: Region = "bangkok") {
  stopSpeaking();
  if (Date.now() < cloudOffUntil) {
    onState?.("playing");
    return browserSpeak(text, gender, () => onState?.("idle"));
  }

  const audio = new Audio();
  current = audio;
  audio.preload = "auto";
  const fallback = () => {
    if (current !== audio) return;
    current = null;
    cloudOffUntil = Date.now() + 2 * 60_000;
    onState?.("playing");
    browserSpeak(text, gender, () => onState?.("idle"));
  };
  audio.onplaying = () => current === audio && onState?.("playing");
  audio.onended = () => current === audio && onState?.("idle");
  audio.onerror = fallback;
  audio.src = prefetched.get(`${region}|${gender}|${text}`)?.src ?? audioUrl(text, gender, region);
  onState?.("loading");
  audio.play().catch((err: unknown) => {
    if (current !== audio) return; // superseded by another tap
    if ((err as DOMException)?.name === "NotAllowedError") return onState?.("idle");
    fallback();
  });
}

/** Warm the cache/HTTP cache for a line the learner will probably play next. */
export function prefetchThai(text: string, gender: Gender, region: Region = "bangkok") {
  if (typeof window === "undefined" || Date.now() < cloudOffUntil) return;
  const key = `${region}|${gender}|${text}`;
  if (prefetched.has(key)) return;
  const a = new Audio();
  a.preload = "auto";
  a.src = audioUrl(text, gender, region);
  a.onerror = () => prefetched.delete(key);
  prefetched.set(key, a);
  if (prefetched.size > 40) prefetched.delete(prefetched.keys().next().value!);
}
