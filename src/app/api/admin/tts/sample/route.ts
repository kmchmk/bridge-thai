import { z } from "zod";
import { getAdmin } from "@/lib/admin";
import { PREVIEW_LINES } from "@/lib/tts/preview";
import { getAudioUrl } from "@/lib/tts/cache";
import { getProvider } from "@/lib/tts/provider";
import { GEMINI_VOICES, PACES, type PaceKey } from "@/lib/tts/voices";

const query = z.object({ voice: z.string(), pace: z.enum(Object.keys(PACES) as [PaceKey, ...PaceKey[]]) });

/** Admin audition: GET ?voice=Kore&pace=learner → 307 to the (cached) preview sentence in that voice. */
export async function GET(req: Request) {
  if (!(await getAdmin())) return new Response("Not found", { status: 404 });
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  const voice = parsed.success ? GEMINI_VOICES.find((v) => v.name === parsed.data.voice) : undefined;
  if (!parsed.success || !voice) return Response.json({ error: "bad request" }, { status: 400 });

  const provider = await getProvider({ male: voice.name, female: voice.name, pace: parsed.data.pace });
  if (!provider) return Response.json({ error: "TTS not configured" }, { status: 501 });
  try {
    const url = await getAudioUrl(provider, PREVIEW_LINES[voice.gender].th, voice.gender);
    return new Response(null, { status: 307, headers: { Location: url, "Cache-Control": "private, max-age=3600" } });
  } catch (e) {
    console.error("admin sample failed", e);
    return Response.json({ error: "tts failed" }, { status: 502 });
  }
}
