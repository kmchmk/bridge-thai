import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { SCENES } from "@/lib/content";
import { describeSetup, parseSetup, setupQuery } from "@/lib/setup";

async function progress(): Promise<Record<string, number>> {
  try {
    const { userId } = await auth();
    if (!userId) return {};
    const rows = await getDb().select().from(schema.sceneProgress).where(eq(schema.sceneProgress.userId, userId));
    return Object.fromEntries(rows.map((r) => [r.sceneId, r.bestStars]));
  } catch {
    return {};
  }
}

export default async function Scenes({ searchParams }: PageProps<"/scenes">) {
  const setup = parseSetup(await searchParams);
  const best = await progress();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-stone-500">Your setup</p>
        <p className="font-semibold">{describeSetup(setup)}</p>
        <Link href={`/?${setupQuery(setup)}`} className="text-sm text-amber-700 underline">Change setup</Link>
      </div>
      <ul className="space-y-3">
        {SCENES.map((s) => (
          <li key={s.id}>
            <Link href={`/play/${s.id}?${setupQuery(setup)}`} className="flex items-center gap-4 rounded-2xl border bg-white p-4 transition hover:border-amber-400 dark:border-stone-700 dark:bg-stone-900">
              <span className="text-4xl">{s.emoji}</span>
              <span className="flex-1">
                <span className="block font-semibold">{s.title}</span>
                <span className="block text-sm text-stone-600 dark:text-stone-300">{s.blurb}</span>
                {!s.reviewed && <span className="mt-1 inline-block rounded bg-stone-200 px-1.5 text-xs dark:bg-stone-800">Draft · awaiting native review</span>}
              </span>
              {best[s.id] ? <span aria-label={`${best[s.id]} stars`}>{"⭐".repeat(best[s.id])}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
