/**
 * Build the admin page's audition clips: for each voice gender × pace × region × mode (Central pronunciation, or the
 * AI accent hint for dialect/accent regions), the region's own sample sentence. Saved to public/audio/audition and listed
 * in src/lib/tts/audition.json (file names carry a content hash, so they can be cached forever).
 *
 *   npx tsx scripts/build-audition.ts
 *
 * Needs OPENROUTER_API_KEY and TTS_MODEL in .env.local. Resumable (existing files are skipped). ~80 clips, a few cents.
 */
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";

config({ path: path.join(process.cwd(), ".env.local") });
const OUT = path.join(process.cwd(), "public/audio/audition");
const INDEX = path.join(process.cwd(), "src/lib/tts/audition.json");

async function main() {
  (globalThis as unknown as { __lame: unknown }).__lame = await import("@breezystack/lamejs");
  const { getProvider } = await import("../src/lib/tts/provider");
  const { REGION_PACKS } = await import("../src/lib/regions");
  const { PACES } = await import("../src/lib/tts/voices");
  const { ttsHash } = await import("../src/lib/tts/hash");
  const paces = Object.keys(PACES) as (keyof typeof PACES)[];

  const jobs: { gender: "male" | "female"; pace: string; region: string; mode: "central" | "accent"; text: string; file: string; run: () => Promise<ArrayBuffer> }[] = [];
  for (const gender of ["male", "female"] as const)
    for (const pace of paces)
      for (const pack of REGION_PACKS)
        for (const mode of pack.kind === "standard" ? (["central"] as const) : (["central", "accent"] as const)) {
          const provider = await getProvider({ pace, region: pack.id, mode, hint: pack.accentHint });
          if (!provider) throw new Error("TTS provider not configured");
          const text = pack.sample[gender].th;
          const voice = provider.voiceFor(gender);
          const hash = ttsHash({ text, voice, provider: provider.name }).slice(0, 10);
          jobs.push({ gender, pace, region: pack.id, mode, text, file: `${gender}-${pace}-${pack.id}-${mode}-${hash}.mp3`, run: async () => (await provider.synthesize(text, voice)).audio });
        }

  fs.mkdirSync(OUT, { recursive: true });
  const todo = jobs.filter((j) => !fs.existsSync(path.join(OUT, j.file)));
  console.log(`${jobs.length} audition clips, ${todo.length} to generate`);
  let next = 0, failed = 0;
  await Promise.all(
    Array.from({ length: 5 }, async () => {
      while (next < todo.length) {
        const j = todo[next++];
        try {
          fs.writeFileSync(path.join(OUT, j.file), Buffer.from(await j.run()));
        } catch (e) {
          failed++;
          console.error("FAILED", j.file, String(e).slice(0, 100));
        }
      }
    }),
  );
  const live = new Set(jobs.map((j) => j.file));
  for (const f of fs.readdirSync(OUT)) if (!live.has(f)) fs.unlinkSync(path.join(OUT, f)); // drop clips from older settings
  fs.writeFileSync(INDEX, JSON.stringify(jobs.map((j) => ({ gender: j.gender, pace: j.pace, region: j.region, mode: j.mode, file: j.file })), null, 1) + "\n");
  console.log(`done: ${todo.length - failed} generated, ${failed} failed`);
}
main().catch((e) => { console.error(e); process.exit(1); });
