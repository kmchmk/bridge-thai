/**
 * Screen OpenRouter TTS models for Thai: synthesize test sentences, transcribe them back with speech-to-text,
 * and score character error rate (CER). Intelligibility only — tones and naturalness need a Thai ear
 * (listen to the finalists in the voice lab).
 *
 *   npx tsx scripts/tts-eval.ts                 # everything
 *   npx tsx scripts/tts-eval.ts gemini grok     # only candidates whose id contains any of these
 *   npx tsx scripts/tts-eval.ts --dry-run       # list what would run
 */
import { config } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { synthesizeOnce } from "../src/lib/tts/openrouter";

config({ path: ".env.local" });
const KEY = process.env.OPENROUTER_API_KEY;
const BASE = "https://openrouter.ai/api/v1";
const OUT = process.env.EVAL_OUT ?? "tts-eval-out";

interface Candidate {
  model: string;
  voices: { voice: string; gender: "male" | "female" }[];
  providerOptions?: Record<string, unknown>;
  note?: string;
}

// Thai support documented by the model makers (OpenRouter's own pages don't list languages).
const CANDIDATES: Candidate[] = [
  { model: "google/gemini-3.8-flash-tts", voices: [{ voice: "Charon", gender: "male" }, { voice: "Puck", gender: "male" }, { voice: "Kore", gender: "female" }, { voice: "Zephyr", gender: "female" }] },
  { model: "google/gemini-3.8-flash-lite-tts", voices: [{ voice: "Charon", gender: "male" }, { voice: "Kore", gender: "female" }] },
  { model: "google/gemini-3.1-flash-tts-preview", voices: [{ voice: "Charon", gender: "male" }, { voice: "Kore", gender: "female" }] },
  { model: "microsoft/mai-voice-2", voices: [{ voice: "en-US-Harper:MAI-Voice-2", gender: "female" }, { voice: "fr-FR-Soleil:MAI-Voice-2", gender: "female" }, { voice: "de-DE-Klaus:MAI-Voice-2", gender: "male" }], note: "only en/es/fr/de voices exposed; tests whether they read Thai" },
  { model: "microsoft/mai-voice-2-flash", voices: [{ voice: "en-US-Harper:MAI-Voice-2", gender: "female" }] },
  { model: "fish-audio/s2.1-pro", voices: [{ voice: "", gender: "female" }], note: "no preset voices" },
  { model: "fish-audio/s2-pro", voices: [{ voice: "", gender: "female" }] },
  { model: "x-ai/grok-voice-tts-1.0", voices: [{ voice: "rex", gender: "male" }, { voice: "leo", gender: "male" }, { voice: "eve", gender: "female" }, { voice: "ara", gender: "female" }] },
  { model: "minimax/speech-2.8-hd", voices: [{ voice: "English_expressive_narrator", gender: "male" }, { voice: "English_radiant_girl", gender: "female" }], note: "English preset voices; Thai voice ids unverified" },
  { model: "minimax/speech-2.8-turbo", voices: [{ voice: "English_expressive_narrator", gender: "male" }, { voice: "English_radiant_girl", gender: "female" }] },
  { model: "qwen/qwen-audio-3.0-tts-plus", voices: [{ voice: "longanlingxin", gender: "female" }, { voice: "longanlufeng", gender: "male" }] },
  { model: "qwen/qwen-audio-3.0-tts-flash", voices: [{ voice: "longanlingxin", gender: "female" }] },
];

// Real app lines plus tone-heavy ones.
const SENTENCES = [
  "สวัสดีครับ ผมขอข้าวซอยหนึ่งชามครับ",
  "เอาเผ็ดไหมคะ",
  "อร่อยมากค่ะ",
  "ยินดีที่ได้รู้จักครับ",
  "ข้าวขาวมากไหมคะ",
  "ราคาห้าสิบบาทค่ะ ขอบคุณค่ะ",
];

const STT_MODELS = ["openai/whisper-large-v3", "openai/gpt-4o-transcribe"];

const norm = (s: string) => s.normalize("NFC").replace(/[\s\p{P}\p{S}0-9a-zA-Z]/gu, "");
function cer(ref: string, hyp: string) {
  const a = [...norm(ref)], b = [...norm(hyp)];
  if (!a.length) return 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length] / a.length;
}

async function transcribe(model: string, audio: ArrayBuffer): Promise<string> {
  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: "POST",
    signal: AbortSignal.timeout(60_000),
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, language: "th", input_audio: { data: Buffer.from(audio).toString("base64"), format: "mp3" } }),
  });
  if (!res.ok) throw new Error(`STT ${model} ${res.status} ${(await res.text()).slice(0, 160)}`);
  return ((await res.json()) as { text: string }).text;
}

const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN);

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  const filters = args.filter((a) => !a.startsWith("--"));
  const list = CANDIDATES.filter((c) => !filters.length || filters.some((f) => c.model.includes(f)));
  const totalChars = list.reduce((n, c) => n + c.voices.length * SENTENCES.reduce((m, s) => m + [...s].length, 0), 0);
  console.log(`${list.length} models, ${list.reduce((n, c) => n + c.voices.length, 0)} voices, ${SENTENCES.length} sentences, ~${totalChars} chars to synthesize`);
  if (dry) return console.log(list.map((c) => `  ${c.model} [${c.voices.map((v) => v.voice || "default").join(", ")}]`).join("\n"));
  if (!KEY) throw new Error("OPENROUTER_API_KEY is not set (.env.local)");

  await fs.mkdir(OUT, { recursive: true });
  const results: unknown[] = [];
  for (const c of list) {
    for (const v of c.voices) {
      const slug = `${c.model}__${v.voice || "default"}`.replace(/[^\w.-]+/g, "_");
      await fs.mkdir(path.join(OUT, slug), { recursive: true });
      const cers: Record<string, number[]> = Object.fromEntries(STT_MODELS.map((m) => [m, []]));
      const errors: string[] = [];
      const t0 = Date.now();
      for (const [i, text] of SENTENCES.entries()) {
        try {
          const { audio } = await synthesizeOnce({ apiKey: KEY, model: c.model, baseUrl: BASE, providerOptions: c.providerOptions }, text, v.voice);
          await fs.writeFile(path.join(OUT, slug, `${i + 1}.mp3`), Buffer.from(audio));
          for (const m of STT_MODELS) {
            try {
              cers[m].push(cer(text, await transcribe(m, audio)));
            } catch (e) {
              errors.push(String(e).slice(0, 200));
            }
          }
        } catch (e) {
          errors.push(String(e).slice(0, 240));
        }
      }
      const row = {
        model: c.model, voice: v.voice || "(default)", gender: v.gender, note: c.note,
        seconds_per_sentence: +((Date.now() - t0) / 1000 / SENTENCES.length).toFixed(1),
        cer_whisper: +median(cers["openai/whisper-large-v3"]).toFixed(3),
        cer_gpt4o: +median(cers["openai/gpt-4o-transcribe"]).toFixed(3),
        ok: cers[STT_MODELS[0]].length, errors: [...new Set(errors)].slice(0, 2),
      };
      results.push(row);
      console.log(JSON.stringify(row));
    }
  }
  await fs.writeFile(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  console.log(`\nAudio + results.json in ${OUT}/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
