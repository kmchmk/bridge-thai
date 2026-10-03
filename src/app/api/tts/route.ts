import { z } from "zod";
import { ACCENT_IDS } from "@/lib/accents";
import { REGION_IDS } from "@/lib/register/types";
import { isKnownLine } from "@/lib/tts/allowlist";
import { ttsHash } from "@/lib/tts/hash";
import { getPlaybackProvider } from "@/lib/tts/provider";
import { staticClipUrl } from "@/lib/tts/static-clips";

const query = z.object({
  text: z.string().min(1).max(300),
  gender: z.enum(["male", "female"]),
  /** Thai course: which regional pack the line belongs to. */
  region: z.enum(REGION_IDS).optional(),
  /** English course: which accent to speak with. Mutually exclusive with region. */
  accent: z.enum(ACCENT_IDS).optional(),
  /** Voice speed (default: natural, for older clients). */
  pace: z.enum(["natural", "learner"]).default("natural"),
  /** Cache-buster only (bumping it invalidates redirects cached by browsers/CDN). */
  v: z.string().optional(),
});

/**
 * GET /api/tts?text=…&gender=…&region=…  (Thai)  or  …&accent=us|uk|au  (English)
 * → 307 to the line's audio file, which ships with the app (public/audio/tts, built by scripts/build-audio.ts).
 * Usable directly as <audio src>. Only sentences that exist in the app's scenes are served.
 * 404 = no clip for this line/voice (the client then falls back to browser speech).
 */
export async function GET(req: Request) {
  const parsed = query.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success || (parsed.data.region && parsed.data.accent))
    return Response.json({ error: "bad request" }, { status: 400 });
  const { text, gender, accent, pace } = parsed.data;
  const region = parsed.data.region ?? "bangkok";

  if (!isKnownLine(text, gender, accent ? "en" : "th"))
    return Response.json({ error: "unknown line" }, { status: 400 });

  const provider = await getPlaybackProvider(
    accent ? { accent, pace } : { region, pace },
  );

  let url = staticClipUrl(
    ttsHash({
      text,
      voice: provider.voiceFor(gender),
      provider: provider.name,
    }),
  );
  if (!url && pace !== "natural") {
    // No clip at the requested pace (yet): fall back to the natural-pace clip rather than nothing.
    const natural = await getPlaybackProvider(
      accent ? { accent, pace: "natural" } : { region, pace: "natural" },
    );
    if (natural)
      url = staticClipUrl(
        ttsHash({
          text,
          voice: natural.voiceFor(gender),
          provider: natural.name,
        }),
      );
  }
  if (!url)
    return Response.json(
      { error: "no audio for this line" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  return new Response(null, {
    status: 307,
    headers: {
      Location: url,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
