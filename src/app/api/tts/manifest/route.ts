import { z } from "zod";
import { ACCENT_IDS } from "@/lib/accents";
import { enSetupSchema } from "@/lib/english";
import { setupSchema } from "@/lib/setup";
import { allLines } from "@/lib/tts/allowlist";
import { linesForEnglishSetup, linesForThaiSetup, resolveClips } from "@/lib/tts/manifest";
import { getProvider } from "@/lib/tts/provider";

const q = z.object({ course: z.enum(["th", "en"]), pace: z.enum(["natural", "learner"]).default("natural") });

/**
 * GET /api/tts/manifest?course=th&sg=…&lg=…&rel=…&region=…   (or course=en&sg=…&lg=…&fm=…&ac=…), plus &pace=natural|learner
 * → { base, now: [[text, "m"|"f", file]…], rest: […] }
 * `now` = every clip this exact setup can play; `rest` = the remaining clips of the whole course.
 * The browser downloads them (now first) into IndexedDB so playback is instant. Clips not generated yet are omitted.
 */
export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const course = q.safeParse(params);
  if (!course.success) return Response.json({ error: "bad request" }, { status: 400 });

  let provider, mine, all, fallbackOpts;
  if (course.data.course === "th") {
    const setup = setupSchema.safeParse({ speakerGender: params.sg, listenerGender: params.lg, relationship: params.rel, region: params.region });
    if (!setup.success) return Response.json({ error: "bad request" }, { status: 400 });
    provider = await getProvider({ region: setup.data.region, pace: course.data.pace });
    fallbackOpts = { region: setup.data.region, pace: "natural" } as const;
    mine = linesForThaiSetup(setup.data);
    all = allLines("th");
  } else {
    const setup = enSetupSchema.safeParse({ speakerGender: params.sg, listenerGender: params.lg, formality: params.fm, accent: params.ac });
    if (!setup.success || !ACCENT_IDS.includes(setup.data.accent)) return Response.json({ error: "bad request" }, { status: 400 });
    provider = await getProvider({ accent: setup.data.accent, pace: course.data.pace });
    fallbackOpts = { accent: setup.data.accent, pace: "natural" } as const;
    mine = linesForEnglishSetup(setup.data);
    all = allLines("en");
  }
  if (!provider) return Response.json({ base: "", now: [], rest: [] }, { headers: { "Cache-Control": "no-store" } });

  // No clip at the requested pace yet? Use the natural-pace one.
  const fallback = course.data.pace !== "natural" ? await getProvider(fallbackOpts) : null;
  const { base, items } = resolveClips(provider, all, fallback);
  const mineKeys = new Set(mine.map((l) => `${l.gender === "male" ? "m" : "f"}\u0000${l.text}`));
  const now = items.filter(([t, g]) => mineKeys.has(`${g}\u0000${t}`));
  const rest = items.filter(([t, g]) => !mineKeys.has(`${g}\u0000${t}`));
  return Response.json({ base, now, rest }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=600" } });
}
