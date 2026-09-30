import { z } from "zod";
import { getAdmin } from "@/lib/admin";
import { getRegion } from "@/lib/regions";
import { REGION_IDS } from "@/lib/register/types";
import { ACCENT_IDS } from "@/lib/accents";
import { PREVIEW_LINES, PREVIEW_LINES_EN } from "@/lib/tts/preview";
import { getAudioUrl } from "@/lib/tts/cache";
import { getProvider } from "@/lib/tts/provider";
import { GEMINI_VOICES, PACES, type PaceKey } from "@/lib/tts/voices";

const query = z.object({
  voice: z.string(),
  pace: z.enum(Object.keys(PACES) as [PaceKey, ...PaceKey[]]),
  /** Optional: audition a region's sample line, with or without its accent hint. */
  region: z.enum(REGION_IDS).optional(),
  /** Optional: audition an English accent instead. */
  accent: z.enum(ACCENT_IDS).optional(),
  mode: z.enum(["central", "accent"]).optional(),
  hint: z.string().max(400).optional(),
});

/** Admin audition: GET ?voice=Kore&pace=learner → 307 to the (cached) preview sentence in that voice. */
export async function GET(req: Request) {
  if (!(await getAdmin())) return new Response("Not found", { status: 404 });
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  const voice = parsed.success ? GEMINI_VOICES.find((v) => v.name === parsed.data.voice) : undefined;
  if (!parsed.success || !voice) return Response.json({ error: "bad request" }, { status: 400 });

  const { region, mode, hint, accent } = parsed.data;
  const provider = await getProvider({ male: voice.name, female: voice.name, pace: parsed.data.pace, region, mode, hint, accent });
  if (!provider) return Response.json({ error: "TTS not configured" }, { status: 501 });
  try {
    const text = accent ? PREVIEW_LINES_EN[voice.gender].en : region ? getRegion(region).sample[voice.gender].th : PREVIEW_LINES[voice.gender].th;
    const url = await getAudioUrl(provider, text, voice.gender);
    return new Response(null, { status: 307, headers: { Location: url, "Cache-Control": "private, max-age=3600" } });
  } catch (e) {
    console.error("admin sample failed", e);
    return Response.json({ error: "tts failed" }, { status: 502 });
  }
}
