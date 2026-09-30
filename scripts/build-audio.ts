/**
 * Generate every Thai line's audio locally and save it in the repo (public/audio/tts/<hash>.mp3), so the app can serve
 * it as plain static files (no Blob/DB needed). Also writes src/lib/tts/static-clips.json (the list of hashes).
 * The hash is the same content hash the runtime cache uses, so a clip is only used while voices/pace match.
 *
 *   npx tsx scripts/build-audio.ts [--lang th|en --accent us|uk|au]
 *
 * Needs OPENROUTER_API_KEY, TTS_MODEL and DATABASE_URL (for the saved voice/pace settings) in .env.local.
 * Resumable: clips that already exist on disk are skipped.
 */
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";

config({ path: path.join(process.cwd(), ".env.local") });

const OUT = path.join(process.cwd(), "public/audio/tts");
const INDEX = path.join(process.cwd(), "src/lib/tts/static-clips.json");

async function main() {
  // tsx runs project files as CJS, which can't load the ESM-only MP3 encoder: load it here and hand it over.
  (globalThis as unknown as { __lame: unknown }).__lame = await import("@breezystack/lamejs");
  const { allLines } = await import("../src/lib/tts/allowlist");
  const { getProvider } = await import("../src/lib/tts/provider");
  const { ttsHash } = await import("../src/lib/tts/hash");

  const args = process.argv.slice(2);
  const arg = (k: string) => args[args.indexOf(k) + 1];
  const lang = (arg("--lang") ?? "th") as "th" | "en";
  const accent = arg("--accent") as "us" | "uk" | "au" | undefined;
  const provider = await getProvider(lang === "en" ? { accent } : { region: "bangkok" });
  if (!provider) throw new Error("TTS provider not configured");
  if (provider.extension !== "mp3") throw new Error("expected MP3 output");

  fs.mkdirSync(OUT, { recursive: true });
  const lines = allLines(lang);
  const jobs = lines.map((l) => ({ l, voice: provider.voiceFor(l.gender), hash: ttsHash({ text: l.text, voice: provider.voiceFor(l.gender), provider: provider.name }) }));
  const todo = jobs.filter((j) => !fs.existsSync(path.join(OUT, `${j.hash}.mp3`)));
  console.log(`${lang}${accent ? "/" + accent : ""}: ${lines.length} lines, voices ${provider.voiceFor("male")}/${provider.voiceFor("female")}, ${todo.length} to generate`);

  let done = 0, failed = 0, next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const j = todo[next++];
      try {
        const { audio } = await provider.synthesize(j.l.text, j.voice);
        fs.writeFileSync(path.join(OUT, `${j.hash}.mp3`), Buffer.from(audio));
      } catch (e) {
        failed++;
        console.error("FAILED", j.l.text.slice(0, 30), String(e).slice(0, 100));
      }
      if (++done % 100 === 0) console.log(`  ${done}/${todo.length} (failed ${failed})`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));

  // Index = every hash we hold, across runs.
  const held = new Set<string>(fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, "utf8")) : []);
  for (const f of fs.readdirSync(OUT)) if (f.endsWith(".mp3")) held.add(f.slice(0, -4));
  fs.writeFileSync(INDEX, JSON.stringify([...held].sort()) + "\n");
  const bytes = fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
  console.log(`done: ${done - failed} generated, ${failed} failed; ${held.size} clips indexed, ${(bytes / 1048576).toFixed(1)} MB`);
}
main().catch((e) => { console.error(e); process.exit(1); });
