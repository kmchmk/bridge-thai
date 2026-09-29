import Link from "next/link";
import { SCENES } from "@/lib/content";
import { getMyProgress } from "@/lib/progress";
import { describeSetup, parseSetup, setupQuery } from "@/lib/setup";

export default async function Scenes({ searchParams }: PageProps<"/scenes">) {
  const setup = parseSetup(await searchParams);
  const { signedIn, rows } = await getMyProgress();
  const byScene = new Map(rows.map((r) => [r.sceneId, r]));

  return (
    <div className="space-y-6 pt-2 lg:pt-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-sm text-stone-500">Your setup</p>
          <p className="text-lg font-semibold sm:text-xl">{describeSetup(setup)}</p>
        </div>
        <Link href={`/?${setupQuery(setup)}`} className="inline-flex min-h-11 items-center text-sm text-amber-700 underline">
          Change setup
        </Link>
      </div>

      {!signedIn && (
        <p className="rounded-xl bg-stone-100 p-3 text-sm text-stone-600 dark:bg-stone-900 dark:text-stone-300">
          Sign in to save your progress automatically and pick up where you left off.
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCENES.map((s) => {
          const p = byScene.get(s.id);
          const inProgress = !!p && p.currentStep > 0;
          return (
            <li key={s.id}>
              <Link
                href={`/play/${s.id}?${setupQuery(setup)}`}
                className="flex h-full min-h-28 flex-col gap-3 rounded-2xl border bg-white p-4 transition hover:border-amber-400 sm:p-5 dark:border-stone-700 dark:bg-stone-900"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="text-4xl">{s.emoji}</span>
                  {p && p.bestStars > 0 && <span aria-label={`${p.bestStars} stars`}>{"⭐".repeat(p.bestStars)}</span>}
                </span>
                <span>
                  <span className="block text-lg font-semibold">{s.title}</span>
                  <span className="block text-sm text-stone-600 dark:text-stone-300">{s.blurb}</span>
                </span>
                <span className="mt-auto flex flex-wrap gap-2 text-xs">
                  {inProgress && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                      Continue · step {p.currentStep + 1}/{s.steps.length}
                    </span>
                  )}
                  {!s.reviewed && <span className="rounded bg-stone-200 px-2 py-0.5 dark:bg-stone-800">Draft · awaiting native review</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
