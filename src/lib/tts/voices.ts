/** Speaking pace presets: the style prompt added to the voice (Gemini TTS follows natural-language style hints). */
export const PACES = {
  natural: { label: "Natural", hint: "Model's default pace", style: undefined, styleEn: undefined },
  learner: {
    label: "Learner",
    hint: "A little slower and clearer (~1.4× longer)",
    style: "Speak clearly and slightly slower than normal, like a friendly Thai teacher.",
    styleEn: "Speak clearly and slightly slower than normal, like a friendly English teacher talking to a learner.",
  },
  slow: {
    label: "Slow",
    hint: "Slowest, tones exaggerated (~2× longer)",
    style: "Speak clearly and a little slowly, like a friendly Thai teacher talking to a learner. Pronounce every tone distinctly.",
    styleEn: "Speak clearly and a little slowly, like a friendly English teacher talking to a learner. Pronounce every word distinctly, including final consonants.",
  },
} as const;

export type PaceKey = keyof typeof PACES;
export const isPace = (v: string): v is PaceKey => v in PACES;
