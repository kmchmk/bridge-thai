"use client";

/** Temporary voice: the browser's built-in Thai speech synthesis. Swap for cloud audio later. */
export function speakThai(text: string, gender: "male" | "female") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "th-TH";
  u.rate = 0.85;
  // Browser voices rarely expose gender; nudge pitch as a hint until cloud voices land.
  u.pitch = gender === "female" ? 1.15 : 0.85;
  const thai = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("th"));
  if (thai[0]) u.voice = thai[0];
  synth.speak(u);
}
