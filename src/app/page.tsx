import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { EnglishSetupForm } from "@/components/EnglishSetupForm";
import { LanguagePicker } from "@/components/LanguagePicker";
import { SetupForm } from "@/components/SetupForm";
import { getDb, schema } from "@/db";
import { getScene } from "@/lib/content";
import { enSetupQuery, enSetupSchema } from "@/lib/english";
import { dictionaries } from "@/lib/i18n";
import { getChosenNative } from "@/lib/lang.server";
import { getMyProgress } from "@/lib/progress";
import { getRegionAudioModes } from "@/lib/tts/settings";
import { setupQuery, setupSchema, DEFAULT_SETUP } from "@/lib/setup";

async function savedProfile() {
  try {
    const { userId } = await auth();
    if (!userId) return undefined;
    const [row] = await getDb().select().from(schema.learnerProfiles).where(eq(schema.learnerProfiles.userId, userId)).limit(1);
    return row;
  } catch {
    return undefined;
  }
}

export default async function Home() {
  const native = await getChosenNative();
  if (!native) return <LanguagePicker />;
  const t = dictionaries[native];
  const course = native === "en" ? "th" : "en";

  const [profile, { rows }, audioModes] = await Promise.all([savedProfile(), getMyProgress(), getRegionAudioModes().catch(() => ({}))]);
  const thSetup = setupSchema.safeParse(profile);
  const enSetup = enSetupSchema.safeParse(profile && { speakerGender: profile.enSpeakerGender, listenerGender: profile.enListenerGender, formality: profile.enFormality, accent: profile.enAccent });

  const resume = rows.find((r) => r.currentStep > 0 && getScene(r.sceneId)?.course === course);
  const resumeScene = resume && getScene(resume.sceneId);
  const resumeQuery = course === "th" ? setupQuery(thSetup.success ? thSetup.data : DEFAULT_SETUP) : enSetupQuery(enSetup.success ? enSetup.data : { speakerGender: "female", listenerGender: "male", formality: "neutral", accent: "us" });

  return (
    <div className="grid gap-8 pt-2 lg:grid-cols-2 lg:items-start lg:gap-16 lg:pt-10">
      <section className="space-y-4 lg:sticky lg:top-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{t.homeTitle}</h1>
        <p className="text-base text-slate-600 sm:text-lg dark:text-slate-300">{t.homeBody}</p>
        <div className="rounded-2xl bg-brand-50 p-4 sm:p-5 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{t.homeStepsTitle}</h2>
          <ol className="space-y-3">
            {t.homeSteps.map((text, k) => (
              <li key={k} className="flex items-center gap-3 text-base sm:text-lg">
                <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{k + 1}</span>
                {text}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="space-y-4">
        {resume && resumeScene && (
          <Link
            href={`/play/${resume.sceneId}?${resumeQuery}`}
            className="flex min-h-16 items-center gap-4 rounded-2xl border border-brand-300 bg-brand-50 p-4 transition hover:border-brand-500 dark:border-brand-700 dark:bg-slate-900"
          >
            <span className="text-3xl">{resumeScene.emoji}</span>
            <span className="flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{t.resumeLabel}</span>
              <span className="block font-semibold">{t.resumeStep(resumeScene.title, resume.currentStep + 1, resumeScene.steps.length)}</span>
            </span>
            <span aria-hidden className="text-xl">→</span>
          </Link>
        )}
        <div className="rounded-3xl border bg-white p-5 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900/60">
          {course === "th" ? (
            <SetupForm initial={thSetup.success ? thSetup.data : undefined} audioModes={audioModes} />
          ) : (
            <EnglishSetupForm initial={enSetup.success ? enSetup.data : undefined} />
          )}
        </div>
      </div>
    </div>
  );
}
