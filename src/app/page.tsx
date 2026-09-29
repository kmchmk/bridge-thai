import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { SetupForm } from "@/components/SetupForm";
import { getDb, schema } from "@/db";
import { getScene } from "@/lib/content";
import { getMyProgress } from "@/lib/progress";
import { setupQuery, setupSchema } from "@/lib/setup";

async function savedSetup() {
  try {
    const { userId } = await auth();
    if (!userId) return undefined;
    const [row] = await getDb().select().from(schema.learnerProfiles).where(eq(schema.learnerProfiles.userId, userId)).limit(1);
    const parsed = setupSchema.safeParse(row);
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export default async function Home() {
  const [initial, { rows }] = await Promise.all([savedSetup(), getMyProgress()]);
  const resume = rows.find((r) => r.currentStep > 0 && getScene(r.sceneId));
  const resumeScene = resume && getScene(resume.sceneId);

  return (
    <div className="grid gap-8 pt-2 lg:grid-cols-2 lg:items-start lg:gap-16 lg:pt-10">
      <section className="space-y-4 lg:sticky lg:top-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Thai changes with who you&apos;re talking to.
        </h1>
        <p className="text-base text-stone-600 sm:text-lg dark:text-stone-300">
          Pick your setup — your gender, theirs, how you know each other, and where you are — then play through
          real-life scenes. Say it right and people warm up to you; get the register wrong and they notice.
        </p>
      </section>

      <div className="space-y-4">
        {resume && resumeScene && (
          <Link
            href={`/play/${resume.sceneId}?${setupQuery(initial ?? { speakerGender: "male", listenerGender: "female", relationship: "friend", region: "bangkok" })}`}
            className="flex min-h-16 items-center gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 transition hover:border-amber-500 dark:border-amber-700 dark:bg-stone-900"
          >
            <span className="text-3xl">{resumeScene.emoji}</span>
            <span className="flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-amber-700">Continue where you left off</span>
              <span className="block font-semibold">{resumeScene.title} · step {resume.currentStep + 1} of {resumeScene.steps.length}</span>
            </span>
            <span aria-hidden className="text-xl">→</span>
          </Link>
        )}
        <div className="rounded-3xl border bg-white p-5 shadow-sm sm:p-8 dark:border-stone-700 dark:bg-stone-900/60">
          <SetupForm initial={initial} />
        </div>
      </div>
    </div>
  );
}
