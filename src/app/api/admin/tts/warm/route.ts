import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ACCENT_IDS } from "@/lib/accents";
import { getAdmin } from "@/lib/admin";
import { allLines } from "@/lib/tts/allowlist";
import { getAudioUrl } from "@/lib/tts/cache";
import { getProvider } from "@/lib/tts/provider";

export const maxDuration = 120;

const body = z.object({
  offset: z.number().int().min(0),
  limit: z.number().int().min(1).max(8),
  /** Which course's lines to generate (default: Thai). English needs an accent: each accent is its own set of clips. */
  lang: z.enum(["th", "en"]).default("th"),
  accent: z.enum(ACCENT_IDS).optional(),
});

/** Optional machine access for bulk generation: `Authorization: Bearer $WARM_TOKEN` (env var; unset = disabled). */
function hasWarmToken(req: Request) {
  const expected = process.env.WARM_TOKEN;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || expected.length < 24 || !given) return false;
  const a = Buffer.from(expected), b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Admin: generate a batch of the app's lines (skips ones already cached). Call repeatedly until `next` is null. */
export async function POST(req: Request) {
  if (!hasWarmToken(req) && !(await getAdmin())) return new Response("Not found", { status: 404 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (parsed.data.lang === "en" && !parsed.data.accent)) return Response.json({ error: "bad request" }, { status: 400 });
  const { lang, accent, offset, limit } = parsed.data;
  const provider = await getProvider(lang === "en" ? { accent } : { region: "bangkok" });
  if (!provider) return Response.json({ error: "TTS not configured" }, { status: 501 });

  const lines = allLines(lang);
  const batch = lines.slice(offset, offset + limit);
  const errors: string[] = [];
  await Promise.all(
    batch.map((l) =>
      getAudioUrl(provider, l.text, l.gender).catch((e: unknown) => {
        errors.push(`${l.text.slice(0, 30)}: ${String(e).slice(0, 120)}`);
      }),
    ),
  );
  const next = offset + batch.length;
  return Response.json({ total: lines.length, next: next < lines.length ? next : null, errors, voice: { male: provider.voiceFor("male"), female: provider.voiceFor("female") } });
}
