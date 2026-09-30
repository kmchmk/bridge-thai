import { z } from "zod";
import { getAdmin } from "@/lib/admin";
import { allLines } from "@/lib/tts/allowlist";
import { getAudioUrl } from "@/lib/tts/cache";
import { getProvider } from "@/lib/tts/provider";

export const maxDuration = 120;

const body = z.object({ offset: z.number().int().min(0), limit: z.number().int().min(1).max(8) });

/** Admin: generate a batch of the app's lines (skips ones already cached). Call repeatedly until `next` is null. */
export async function POST(req: Request) {
  if (!(await getAdmin())) return new Response("Not found", { status: 404 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const provider = await getProvider();
  if (!provider) return Response.json({ error: "TTS not configured" }, { status: 501 });

  const lines = allLines();
  const batch = lines.slice(parsed.data.offset, parsed.data.offset + parsed.data.limit);
  const errors: string[] = [];
  await Promise.all(
    batch.map((l) =>
      getAudioUrl(provider, l.text, l.gender).catch((e: unknown) => {
        errors.push(`${l.text.slice(0, 30)}: ${String(e).slice(0, 120)}`);
      }),
    ),
  );
  const next = parsed.data.offset + batch.length;
  return Response.json({ total: lines.length, next: next < lines.length ? next : null, errors });
}
