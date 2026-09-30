import { z } from "zod";
import { isKnownLine } from "@/lib/tts/allowlist";
import { getAudioUrl } from "@/lib/tts/cache";
import { getProvider } from "@/lib/tts/provider";

const query = z.object({ text: z.string().min(1).max(300), gender: z.enum(["male", "female"]) });

/**
 * GET /api/tts?text=…&gender=…  →  307 to the cached audio (generated on first request only).
 * Usable directly as <audio src>. Only sentences that exist in the app's scenes are served.
 * 501 = no provider configured (client falls back to browser speech).
 */
export async function GET(req: Request) {
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { text, gender } = parsed.data;

  if (!isKnownLine(text, gender)) return Response.json({ error: "unknown line" }, { status: 400 });

  const provider = await getProvider();
  if (!provider) return Response.json({ error: "no TTS provider configured" }, { status: 501, headers: { "Cache-Control": "no-store" } });

  try {
    const url = await getAudioUrl(provider, text, gender);
    return new Response(null, {
      status: 307,
      headers: { Location: url, "Cache-Control": "public, max-age=86400, s-maxage=31536000" },
    });
  } catch (err) {
    console.error("TTS generation failed", err);
    return Response.json({ error: "tts failed" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
