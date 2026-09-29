import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getAudioUrl } from "@/lib/tts/cache";
import { getProvider } from "@/lib/tts/provider";

const query = z.object({ text: z.string().min(1).max(300), gender: z.enum(["male", "female"]) });

/** GET /api/tts?text=…&gender=… → { url } from the cache, or 501 so the client uses browser speech. */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });

  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });

  const provider = getProvider();
  if (!provider) return Response.json({ error: "no TTS provider configured" }, { status: 501 });

  const url = await getAudioUrl(provider, parsed.data.text, parsed.data.gender);
  return Response.json({ url });
}
