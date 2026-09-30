export type Gender = "male" | "female";

export interface GeminiVoice {
  name: string;
  gender: Gender;
  /** Google's one-word description of the voice. Gender labels follow Google's voice catalog (approximate — audition to confirm). */
  trait: string;
}

export const GEMINI_VOICES: GeminiVoice[] = [
  { name: "Charon", gender: "male", trait: "Informative" },
  { name: "Iapetus", gender: "male", trait: "Clear" },
  { name: "Puck", gender: "male", trait: "Upbeat" },
  { name: "Orus", gender: "male", trait: "Firm" },
  { name: "Umbriel", gender: "male", trait: "Easy-going" },
  { name: "Algieba", gender: "male", trait: "Smooth" },
  { name: "Achird", gender: "male", trait: "Friendly" },
  { name: "Schedar", gender: "male", trait: "Even" },
  { name: "Sadaltager", gender: "male", trait: "Knowledgeable" },
  { name: "Rasalgethi", gender: "male", trait: "Informative" },
  { name: "Alnilam", gender: "male", trait: "Firm" },
  { name: "Zubenelgenubi", gender: "male", trait: "Casual" },
  { name: "Sadachbia", gender: "male", trait: "Lively" },
  { name: "Fenrir", gender: "male", trait: "Excitable" },
  { name: "Enceladus", gender: "male", trait: "Breathy" },
  { name: "Algenib", gender: "male", trait: "Gravelly" },
  { name: "Kore", gender: "female", trait: "Firm" },
  { name: "Erinome", gender: "female", trait: "Clear" },
  { name: "Zephyr", gender: "female", trait: "Bright" },
  { name: "Leda", gender: "female", trait: "Youthful" },
  { name: "Aoede", gender: "female", trait: "Breezy" },
  { name: "Callirrhoe", gender: "female", trait: "Easy-going" },
  { name: "Autonoe", gender: "female", trait: "Bright" },
  { name: "Despina", gender: "female", trait: "Smooth" },
  { name: "Laomedeia", gender: "female", trait: "Upbeat" },
  { name: "Achernar", gender: "female", trait: "Soft" },
  { name: "Gacrux", gender: "female", trait: "Mature" },
  { name: "Pulcherrima", gender: "female", trait: "Forward" },
  { name: "Vindemiatrix", gender: "female", trait: "Gentle" },
  { name: "Sulafat", gender: "female", trait: "Warm" },
];

export const PACES = {
  natural: { label: "Natural", hint: "Model's default pace", style: undefined },
  learner: {
    label: "Learner",
    hint: "A little slower and clearer (~1.4× longer)",
    style: "Speak clearly and slightly slower than normal, like a friendly Thai teacher.",
  },
  slow: {
    label: "Slow",
    hint: "Slowest, tones exaggerated (~2× longer)",
    style: "Speak clearly and a little slowly, like a friendly Thai teacher talking to a learner. Pronounce every tone distinctly.",
  },
} as const;

export type PaceKey = keyof typeof PACES;
export const isPace = (v: string): v is PaceKey => v in PACES;
