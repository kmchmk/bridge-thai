/** Read-only text/audio audit: never synthesizes, fetches or changes audio files. */
import fs from "node:fs";
import { SCENES } from "../src/lib/content";
import { EN_SCENES, FORMALITIES, buildEnSteps } from "../src/lib/english";
import { buildAtlasContent } from "../src/lib/atlas/content";
import { LOCATIONS } from "../src/lib/atlas/catalog";
import { allLines } from "../src/lib/tts/allowlist";
import { getPlaybackProvider } from "../src/lib/tts/provider";
import { ttsHash } from "../src/lib/tts/hash";
import { staticClipFile } from "../src/lib/tts/static-clips";
async function main() {
  const arg = process.argv.indexOf("--out");
  const output =
    arg >= 0 ? process.argv[arg + 1] : "/tmp/scenario-text-audit.json";
  if (!output) throw new Error("--out requires a path");
  const content = buildAtlasContent();
  const scenarioTexts = Object.entries(content.thai)
    .flatMap(([gender, scenes]) =>
      scenes.map((scene) => ({
        course: "th",
        gender,
        region: LOCATIONS.find((l) => l.id === scene.id)!.region,
        ...scene,
      })),
    )
    .concat(
      Object.entries(content.english).flatMap(([variant, scenes]) =>
        scenes.map((scene) => ({
          course: "en",
          gender: variant.split(":")[0],
          region: variant.split(":")[1],
          variant,
          ...scene,
        })),
      ),
    );
  const missing = [];
  for (const pace of ["learner", "natural"] as const) {
    for (const accent of [null, "us", "uk", "au"] as const) {
      const lang = accent ? "en" : "th";
      const provider = await getPlaybackProvider(
        accent ? { accent, pace } : { region: "bangkok", pace },
      );
      for (const line of allLines(lang)) {
        const voice = provider.voiceFor(line.gender);
        const hash = ttsHash({
          text: line.text,
          voice,
          provider: provider.name,
        });
        if (!staticClipFile(hash))
          missing.push({ ...line, accent, pace, voice, hash });
      }
    }
  }
  const summary = {
    thaiScenes: SCENES.length,
    thaiExchanges: SCENES.reduce((n, s) => n + s.steps.length, 0),
    englishScenes: EN_SCENES.length,
    englishExchanges: EN_SCENES.reduce((n, s) => n + s.steps.length, 0),
    liveEncounters: LOCATIONS.length,
    englishTextVariants: EN_SCENES.reduce(
      (n, s) =>
        n +
        FORMALITIES.reduce(
          (m, formality) =>
            m +
            ["us", "uk", "au"].reduce(
              (k, accent) =>
                k +
                buildEnSteps(s, {
                  speakerGender: "female",
                  listenerGender: "male",
                  formality,
                  accent: accent as "us" | "uk" | "au",
                }).length,
              0,
            ),
          0,
        ),
      0,
    ),
    missingClips: missing.length,
    missingByCourse: {
      th: missing.filter((l) => l.lang === "th").length,
      en: missing.filter((l) => l.lang === "en").length,
    },
  };
  fs.writeFileSync(
    output,
    JSON.stringify({ summary, scenarioTexts, missingAudio: missing }, null, 2) +
      "\n",
  );
  console.log(JSON.stringify({ ...summary, output }));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
